import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { categorizeReport, createReport } from '../../services/report.services';
import { getCategories } from '../../services/category.services';
import OfficerContacts from './OfficerContacts';
import { useToast } from '../../contexts/ToastContext';

// Simple client validation helpers
const MIN_DESC = 20;

const steps = [
  'intro',
  'details',
  'photos',
  'categorize',
  'officers',
  'confirm'
];

const CreateReport = () => {
  const { isLoaded, user } = useUser();
  const navigate = useNavigate();
  const { notify } = useToast();

  const [stepIdx, setStepIdx] = useState(0);
  const step = steps[stepIdx];
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]); // array of { url, name }
  const [photoInput, setPhotoInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null); // { category, department, officers, suggestions? }
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [chosenCategoryId, setChosenCategoryId] = useState('');
  const [overrideConfirmed, setOverrideConfirmed] = useState(true);
  const [resetting, setResetting] = useState(false);

  // Debug: log initial mount
  useEffect(()=>{
    console.log('[CreateReport] Mounted component');
    return () => console.log('[CreateReport] Unmounted component');
  },[]);

  // Derived helper to know if there's anything to reset
  const hasDraft = !!(title || description || photos.length || aiResult || chosenCategoryId || stepIdx > 0);

  // Load draft from localStorage
  useEffect(()=>{
    try {
      const raw = localStorage.getItem('report-draft');
      if(raw){
        const d = JSON.parse(raw);
  console.log('[CreateReport] Loaded draft from localStorage', d);
        if(d.title) setTitle(d.title);
        if(d.description) setDescription(d.description);
        if(Array.isArray(d.photos)) setPhotos(d.photos);
        if(typeof d.stepIdx === 'number' && d.stepIdx >=0 && d.stepIdx < steps.length) setStepIdx(d.stepIdx);
        if(d.chosenCategoryId) setChosenCategoryId(d.chosenCategoryId);
      }
    } catch(_){ }
  },[]);

  // Persist draft (simple debounce)
  useEffect(()=>{
    const t = setTimeout(()=>{
      try { localStorage.setItem('report-draft', JSON.stringify({ title, description, photos, stepIdx, chosenCategoryId })); } catch(_){ }
    }, 400);
    return ()=> clearTimeout(t);
  },[title, description, photos, stepIdx, chosenCategoryId]);

  // Log step changes
  useEffect(()=>{
    console.log('[CreateReport] Step changed ->', stepIdx, steps[stepIdx]);
  },[stepIdx]);

  // Reset draft helper
  function resetDraft(confirmNeeded = true){
    if(confirmNeeded && !window.confirm('Discard this draft and start over?')) return;
    setResetting(true);
    setTitle('');
    setDescription('');
    setPhotos([]);
    setPhotoInput('');
    setAiResult(null);
    setChosenCategoryId('');
    setOverrideConfirmed(true);
    setError('');
    setStepIdx(0);
    try { localStorage.removeItem('report-draft'); } catch(_){ }
    setTimeout(()=> setResetting(false), 250);
    notify('Draft reset', 'info');
  }

  if (!isLoaded) return <div className="text-sm text-gray-500">Loading...</div>;
  if (!user) return <div className="text-sm text-gray-500">Please sign in.</div>;

  function next() {
    if (stepIdx < steps.length - 1) setStepIdx(i => i + 1);
  }
  function prev() {
    if (stepIdx > 0) setStepIdx(i => i - 1);
  }

  async function handleIntroChoice(go) {
    if (go) next(); else navigate('/');
  }

  function validateDetails() {
    if (!title.trim()) { setError('Title is required'); return false; }
    if (description.trim().length < MIN_DESC) { setError(`Description must be at least ${MIN_DESC} characters`); return false; }
    setError('');
    return true;
  }

  async function runCategorize() {
    if (!validateDetails()) return;
    setAiLoading(true); setAiResult(null); setError('');
    console.log('[CreateReport] Running AI categorization', { descriptionLength: description.trim().length });
    try {
      const res = await categorizeReport(description.trim()); // expects backend may now include suggestions + all officers
      setAiResult(res);
      console.log('[CreateReport] AI result received', res);
      if(res?.suggestions){
        console.log('[CreateReport] Suggestions received', res.suggestions);
      }
      if(res?.category?.id){
        setChosenCategoryId(res.category.id);
        setOverrideConfirmed(true);
      }
      next(); // move to officers step automatically
    } catch (e) {
      console.log('[CreateReport] AI categorization error', e);
      const msg = e?.response?.data?.message || 'AI categorization failed';
      setError(msg); notify(msg, 'error');
    } finally { setAiLoading(false); }
  }

  async function submit() {
    if (!aiResult?.category?.id) { setError('AI classification missing. Please re-run.'); return; }
    if (!chosenCategoryId) { setError('Please select a category.'); return; }
    if (chosenCategoryId !== aiResult.category.id && !overrideConfirmed) { setError('Please confirm category override.'); return; }
    setSubmitting(true); setError('');
    console.log('[CreateReport] Submitting report', {
      titleLength: title.trim().length,
      descriptionLength: description.trim().length,
      photosCount: photos.length,
      chosenCategoryId,
      aiCategoryId: aiResult.category.id,
      override: chosenCategoryId !== aiResult.category.id
    });
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        categoryId: chosenCategoryId,
        reporterId: user.publicMetadata?.mongoId || user.id,
        photosBefore: photos.map(p => ({ url: p.url }))
      };
      console.log('[CreateReport] Payload prepared (sanitized)', { ...payload, description: undefined });
      await createReport(payload);
      notify('Report created', 'success');
      try { localStorage.removeItem('report-draft'); } catch(_){ }
      navigate('/user/reports');
    } catch (e) {
      console.log('[CreateReport] Submission error', e);
      const msg = e?.response?.data?.message || 'Failed to create report';
      setError(msg); notify(msg, 'error');
    } finally { setSubmitting(false); }
  }

  // Fetch categories when entering officers step
  useEffect(()=>{
    if(step === 'officers' && categories.length === 0){
      let cancelled=false;
      (async()=>{
        setCategoriesLoading(true);
        try { const res = await getCategories({ limit: 500 }); if(!cancelled) setCategories(res.items || res || []); }
        catch(_){ }
        finally { if(!cancelled) setCategoriesLoading(false); }
      })();
      return ()=>{ cancelled=true; };
    }
  },[step, categories.length]);

  // Drag & drop image handling (data URLs for preview only)
  const handleFiles = useCallback((fileList)=>{
    const files = Array.from(fileList).filter(f=>f.type.startsWith('image/')).slice(0,10);
    files.forEach(f=>{
      const reader = new FileReader();
      reader.onload = ev => { setPhotos(p=>[...p, { url: ev.target.result, name: f.name }]); };
      reader.readAsDataURL(f);
    });
  },[]);
  const onDrop = e=>{ e.preventDefault(); e.stopPropagation(); if(e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files); };
  const onDragOver = e=>{ e.preventDefault(); e.stopPropagation(); };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">{/* ROOT WRAPPER START */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">New Report</h1>
        {hasDraft && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={resetting}
              onClick={()=> resetDraft(true)}
              className="h-9 px-3 rounded-md border border-gray-300 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >{resetting ? 'Resetting...' : 'Reset Draft'}</button>
          </div>
        )}
      </div>
      <Progress stepIdx={stepIdx} goTo={(idx)=>{ if(idx<=stepIdx){ setStepIdx(idx);} }} />
      {hasDraft && (
        <div className="text-[11px] text-gray-500 -mt-3">
          Stuck? Use <button onClick={()=> resetDraft(true)} className="underline hover:text-indigo-600">Reset Draft</button> to start fresh.
        </div>
      )}
      {step === 'intro' && (
        <div className="space-y-4 bg-white/80 border border-gray-200 rounded-xl p-6">
          <p className="text-sm text-gray-700">Do you want to proceed with creating a new report?</p>
          <div className="flex gap-3">
            <button onClick={() => handleIntroChoice(true)} className="px-4 h-10 text-sm font-medium rounded-md bg-indigo-600 text-white">Yes, continue</button>
            <button onClick={() => handleIntroChoice(false)} className="px-4 h-10 text-sm font-medium rounded-md border border-gray-300 text-gray-700 bg-white">No, go back</button>
          </div>
        </div>
      )}
      {step === 'details' && (
        <div className="space-y-5 bg-white/80 border border-gray-200 rounded-xl p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Title<span className="text-rose-500">*</span></label>
            <input value={title} onChange={e=>setTitle(e.target.value)} className="w-full h-11 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 text-sm" placeholder="Short summary" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Description<span className="text-rose-500">*</span></label>
              <span className="text-[11px] text-gray-500">{description.length}</span>
            </div>
            <textarea rows={5} value={description} onChange={e=>setDescription(e.target.value.slice(0,1000))} className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 text-sm resize-none" placeholder="Describe the issue, impact, urgency... (min 20 chars)" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={()=>{ if(validateDetails()) next(); }} className="px-4 h-10 rounded-md bg-indigo-600 text-white text-sm font-medium">Continue</button>
            <button onClick={prev} disabled={stepIdx===0} className="px-4 h-10 rounded-md border border-gray-300 text-sm font-medium">Back</button>
            <button type="button" onClick={()=> resetDraft(true)} className="ml-auto text-[11px] text-gray-600 hover:underline">Reset</button>
          </div>
        </div>
      )}
      {step === 'photos' && (
        <div className="space-y-5 bg-white/80 border border-gray-200 rounded-xl p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Photo URLs (optional)</label>
            <div className="flex gap-2">
              <input value={photoInput} onChange={e=>setPhotoInput(e.target.value)} placeholder="https://..." className="flex-1 h-11 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60" />
              <button type="button" onClick={()=>{ if(photoInput.trim()){ setPhotos(p=>[...p, { url: photoInput.trim() }]); setPhotoInput(''); } }} className="px-3 h-11 rounded-md bg-indigo-600 text-white text-sm">Add</button>
            </div>
            <div onDrop={onDrop} onDragOver={onDragOver} className="mt-3 border-2 border-dashed rounded-lg p-6 text-center text-xs text-gray-500 bg-white/60">
              <p className="mb-2">Drag & drop images here or <span className="font-medium">click to select</span></p>
              <input type="file" multiple accept="image/*" onChange={e=> e.target.files && handleFiles(e.target.files)} className="hidden" id="fileInputHidden" />
              <label htmlFor="fileInputHidden" className="cursor-pointer inline-block px-3 py-1.5 rounded-md bg-indigo-600 text-white text-[11px] font-medium">Browse Files</label>
            </div>
            {photos.length>0 && (
              <ul className="text-xs text-gray-700 space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2 bg-white/60">
                {photos.map((p,i)=>(
                  <li key={i} className="flex items-center justify-between gap-2">
                    <span className="truncate flex-1">{p.name || p.url.slice(0,50)}</span>
                    <button type="button" onClick={()=>setPhotos(arr=>arr.filter((_,idx)=>idx!==i))} className="text-[10px] text-rose-600 hover:underline">remove</button>
                  </li>
                ))}
              </ul>
            )}
            {photos.length>0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
                {photos.slice(0,12).map((p,i)=>(<img key={i} src={p.url} alt={p.name||'preview'} className="h-24 w-full object-cover rounded-md border" loading="lazy" />))}
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={next} className="px-4 h-10 rounded-md bg-indigo-600 text-white text-sm font-medium">Continue</button>
            <button onClick={prev} className="px-4 h-10 rounded-md border border-gray-300 text-sm font-medium">Back</button>
            <button type="button" onClick={()=> resetDraft(true)} className="ml-auto text-[11px] text-gray-600 hover:underline">Reset</button>
          </div>
        </div>
      )}
      {step === 'categorize' && (
        <div className="space-y-5 bg-white/80 border border-gray-200 rounded-xl p-6">
          <p className="text-sm text-gray-700">We'll analyze your report with AI to suggest the best category and department. Continue?</p>
          <div className="flex gap-3">
            <button disabled={aiLoading} onClick={runCategorize} className="px-4 h-10 rounded-md bg-indigo-600 text-white text-sm font-medium disabled:opacity-50">{aiLoading?'Analyzing...':'Run AI Categorization'}</button>
            <button onClick={prev} className="px-4 h-10 rounded-md border border-gray-300 text-sm font-medium">Back</button>
            <button type="button" onClick={()=> resetDraft(true)} className="ml-auto text-[11px] text-gray-600 hover:underline">Reset</button>
          </div>
          {aiLoading && <div className="text-xs text-indigo-600">Analyzing description...</div>}
          {error && <div className="text-xs text-rose-600 font-medium">{error}</div>}
        </div>
      )}
      {step === 'officers' && aiResult && (
        <div className="space-y-5 bg-white/80 border border-gray-200 rounded-xl p-6">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-800">AI Classification</h3>
            <div className="text-xs text-gray-700">Category: <span className="font-medium text-indigo-600">{aiResult.category?.name || 'Unknown'}</span></div>
            <div className="text-xs text-gray-700">Department: <span className="font-medium">{aiResult.department?.name || '—'}</span></div>
          </div>
          {aiResult.suggestions && aiResult.suggestions.length > 1 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-700">Other Suggested Categories</div>
              <ul className="space-y-1 bg-white/70 border border-gray-200 rounded-md p-2 max-h-40 overflow-y-auto">
                {aiResult.suggestions.map(s => (
                  <li key={s.id || s.name} className="flex items-center gap-2 text-[11px]">
                    <input
                      type="radio"
                      name="suggestedCategory"
                      value={s.id || ''}
                      checked={chosenCategoryId === (s.id || '')}
                      onChange={() => { setChosenCategoryId(s.id || ''); setOverrideConfirmed(true); }}
                      className="h-3 w-3 text-indigo-600"
                    />
                    <span className="flex-1 truncate {chosenCategoryId === (s.id||'') ? 'font-semibold text-indigo-600' : ''}">{s.name}</span>
                  </li>
                ))}
              </ul>
              <div className="text-[10px] text-gray-500">Select a category above if different from the primary.</div>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700">Override Category (optional)</label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select value={chosenCategoryId} onChange={e=>{ setChosenCategoryId(e.target.value); setOverrideConfirmed(e.target.value === (aiResult.category?.id||'')); }} className="flex-1 h-10 rounded-md border border-gray-300 text-xs px-2 bg-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-500/60">
                <option value="">-- Select Category --</option>
                {categories.map(c=> <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>)}
              </select>
              {categoriesLoading && <span className="text-[10px] text-gray-500">Loading...</span>}
            </div>
            {chosenCategoryId && chosenCategoryId !== (aiResult.category?.id||'') && !overrideConfirmed && (
              <div className="flex items-center gap-3 text-[11px] text-amber-700 bg-amber-50 border border-amber-300 rounded-md px-2 py-1">
                <span>Category changed. Confirm override?</span>
                <button type="button" onClick={()=> setOverrideConfirmed(true)} className="px-2 h-7 rounded bg-amber-600 text-white text-[10px] font-medium">Confirm Override</button>
              </div>
            )}
            {chosenCategoryId && chosenCategoryId !== (aiResult.category?.id||'') && overrideConfirmed && (
              <div className="text-[10px] text-amber-600">Override confirmed.</div>
            )}
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-700">Officer Contacts</h4>
            <OfficerContacts officers={aiResult.officers || []} />
            {(!aiResult.officers || aiResult.officers.length === 0) && (
              <div className="text-[10px] text-gray-500">No officers found for this category yet.</div>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={next} className="px-4 h-10 rounded-md bg-indigo-600 text-white text-sm font-medium">Looks Good</button>
            <button onClick={()=>{ setStepIdx(steps.indexOf('categorize')); }} className="px-4 h-10 rounded-md border border-gray-300 text-sm font-medium">Re-run</button>
            <button type="button" onClick={()=> resetDraft(true)} className="ml-auto text-[11px] text-gray-600 hover:underline">Reset</button>
          </div>
        </div>
      )}
      {step === 'confirm' && aiResult && (
        <div className="space-y-6 bg-white/80 border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-800">Confirm & Submit</h3>
          <div className="space-y-3 text-xs text-gray-700">
            <div><span className="font-medium">Title:</span> {title}</div>
            <div><span className="font-medium">Description:</span> <span className="whitespace-pre-wrap break-words">{description}</span></div>
            <div><span className="font-medium">Photos:</span> {photos.length || '0'}{photos.length>0 && ' (first shown below)'}
              {photos.length>0 && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {photos.slice(0,4).map((p,i)=>(<img key={i} src={p.url} alt={p.name||'preview'} className="h-32 w-full object-cover rounded-md border" loading="lazy" />))}
                </div>
              )}
            </div>
            <div><span className="font-medium">AI Category:</span> {aiResult.category?.name}</div>
            <div><span className="font-medium">Final Category:</span> {(categories.find(c=> (c._id||c.id)===chosenCategoryId)?.name) || aiResult.category?.name}</div>
            <div><span className="font-medium">Department:</span> {aiResult.department?.name || '—'}</div>
          </div>
          {error && <div className="text-xs text-rose-600 font-medium">{error}</div>}
          <div className="flex gap-3">
            <button disabled={submitting} onClick={submit} className="px-5 h-11 rounded-md bg-indigo-600 text-white text-sm font-medium disabled:opacity-50">{submitting? 'Submitting...' : 'Submit Report'}</button>
            <button disabled={submitting} onClick={()=> setStepIdx(steps.indexOf('officers'))} className="px-4 h-11 rounded-md border border-gray-300 text-sm font-medium">Back</button>
            <button disabled={submitting} onClick={()=> navigate('/user/reports')} className="px-4 h-11 rounded-md border border-gray-300 text-sm font-medium">Cancel</button>
            <button type="button" onClick={()=> resetDraft(true)} disabled={submitting} className="ml-auto text-[11px] text-gray-600 hover:underline">Reset Draft</button>
          </div>
        </div>
      )}
    </div> // ROOT WRAPPER END
  );
};

const Progress = ({ stepIdx, goTo }) => {
  const pct = (stepIdx/(steps.length-1))*100;
  return (
    <div className="space-y-2 w-full">
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-600 transition-all" style={{ width: pct+'%' }} />
      </div>
      <ol className="flex justify-between text-[10px] font-medium text-gray-500">
        {steps.map((s,i)=>(
          <li key={s} className="flex-1 flex justify-center">
            <button
              type="button"
              onClick={()=> { if(i<=stepIdx) goTo?.(i); }}
              className={`px-1.5 py-0.5 rounded ${i===stepIdx? 'text-indigo-600 underline' : i<stepIdx? 'text-indigo-500' : 'text-gray-400'} transition-colors`}
            >{s}</button>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default CreateReport;
