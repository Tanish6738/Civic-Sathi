import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useParams, useNavigate } from 'react-router-dom';
import { createReport, getReportById, updateReport, categorizeReport } from '../../services/report.services';
import { getActions, createAction } from '../../services/action.services';
import { getAuditLogs } from '../../services/auditLog.services';
import { useToast } from '../../contexts/ToastContext';

const STATUS_CLOSE_CONFIRM = 'awaiting_verification';

const Report = () => {
  const { id: reportId } = useParams();
  const { notify } = useToast();
  const { isLoaded, user } = useUser();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', description: '', categoryId: '', department: '', photosBefore: [] });
  const [existing, setExisting] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const navigate = useNavigate();
  const [actions, setActions] = useState([]);
  const [loadingActions, setLoadingActions] = useState(false);
  const [actionNote, setActionNote] = useState('');
  const [actionPhotos, setActionPhotos] = useState(''); // comma separated urls
  const [creatingAction, setCreatingAction] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const maxDescription = 1000;
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null); // { category, department, officers }
  const [showAIPreview, setShowAIPreview] = useState(false);

  useEffect(()=>{ if(success){ const t=setTimeout(()=>setSuccess(false),3000); return ()=>clearTimeout(t);} },[success]);

  if (!isLoaded) return <div className="text-sm text-gray-500">Loading...</div>;
  if (!user) return <div className="text-sm text-gray-500">Please sign in.</div>;

  const isCreateMode = !reportId || reportId === 'new';

  // Fetch existing report if viewing details
  useEffect(() => {
    if (isCreateMode) return; // skip for new
    let cancelled = false;
    async function loadExisting() {
      setLoadingExisting(true);
      try {
        const data = await getReportById(reportId).catch(()=>null);
        if (!cancelled && data) setExisting(data);
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    }
    loadExisting();
    return () => { cancelled = true; };
  }, [reportId, isCreateMode]);

  // Load actions
  useEffect(()=>{
    if(isCreateMode) return;
    let cancelled = false;
    async function load(){
      setLoadingActions(true);
      try { const res = await getActions({ report: reportId, limit: 100 }); if(!cancelled) setActions(res.items || []); }
      catch(e){ /* silent */ }
      finally { if(!cancelled) setLoadingActions(false); }
    }
    load();
    return ()=>{ cancelled = true; };
  },[reportId, isCreateMode]);

  // Load audit logs
  useEffect(()=>{
    if(isCreateMode) return;
    let cancelled = false;
    async function load(){
      setLoadingLogs(true);
      try { const res = await getAuditLogs({ report: reportId, limit: 50 }); if(!cancelled) setAuditLogs(res.items || []); }
      catch(e){ /* silent */ }
      finally { if(!cancelled) setLoadingLogs(false); }
    }
    load();
    return ()=>{ cancelled = true; };
  },[reportId, isCreateMode]);

  const isOfficer = (user.publicMetadata?.role || user.publicMetadata?.mongoRole) === 'officer';

  async function submitAction(e){
    e.preventDefault();
    if(!actionNote.trim()) return;
    setCreatingAction(true);
    try {
      await createAction({ report: reportId, officer: user.publicMetadata?.mongoId || user.id, note: actionNote.trim(), photos: actionPhotos.split(',').map(s=>s.trim()).filter(Boolean) });
      notify('Action added','success');
      setActionNote(''); setActionPhotos('');
      // Refresh actions
      const res = await getActions({ report: reportId, limit: 100 });
      setActions(res.items || []);
    } catch (e) { notify(e?.response?.data?.message || 'Failed to add action','error'); }
    finally { setCreatingAction(false); }
  }

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: name === 'description' ? value.slice(0, maxDescription) : value }));
  };

  async function runCategorize(){
    if(!form.description.trim()) return;
    setAiLoading(true); setAiResult(null);
    try { const data = await categorizeReport(form.description.trim()); setAiResult(data); setShowAIPreview(true); }
    catch(e){ notify(e?.response?.data?.message || 'AI categorization failed','error'); }
    finally { setAiLoading(false); }
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    if (reportId) return; // viewing mode
    setError(''); setSuccess(false);
    if(!form.title || !form.description){ setError('Title and description required'); return; }
    // If AI preview not yet confirmed, trigger it
    if(!showAIPreview){ await runCategorize(); return; }
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        categoryId: form.categoryId || aiResult?.category?.id || undefined,
        reporterId: user.publicMetadata?.mongoId || user.id,
        department: form.department || undefined,
        photosBefore: form.photosBefore.filter(Boolean)
      };
      await createReport(payload);
      setSuccess(true); notify('Report submitted', 'success');
      navigate('/user/reports');
    } catch (err) {
  const msg = err?.response?.data?.message || 'Submission failed';
  notify(msg, 'error');
      setError(msg);
    } finally {
      setSubmitting(false);
      setTimeout(()=> setSuccess(false), 4000);
    }
  };

  // View existing report details mode
  if (!isCreateMode) {
    if (loadingExisting) return <div className="text-sm text-gray-500">Loading report...</div>;
    if (!existing) return <div className="text-sm text-gray-500">Report not found.</div>;
    const canConfirmClose = existing.status === STATUS_CLOSE_CONFIRM && (user.publicMetadata?.mongoId === existing.reporter?._id || user.id === existing.reporter?._id);
    return (
      <div className="max-w-3xl mx-auto space-y-6 px-3 sm:px-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-2">Report Details</h1>
          <p className="text-sm text-gray-600">Submitted {new Date(existing.createdAt).toLocaleString()}</p>
        </div>
        <div className="space-y-5 bg-white/80 backdrop-blur p-6 rounded-xl border border-gray-200">
          <div className="flex flex-wrap gap-3 items-center">
            <h2 className="text-lg font-semibold text-gray-900 flex-1">{existing.title}</h2>
            <span className="text-[11px] font-semibold px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">{existing.category?.name || 'Uncategorized'}</span>
            <span className="text-[11px] font-semibold px-2 py-1 rounded-md bg-gray-100 text-gray-700 ring-1 ring-gray-300">{existing.status}</span>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{existing.description}</p>
          {existing.photosBefore?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-800 mb-2">Before Photos</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {existing.photosBefore.map((p,i)=>(<img key={i} src={p.url} alt="before" className="rounded-lg border border-gray-200 object-cover w-full h-52" loading="lazy" />))}
              </div>
            </div>
          )}
          {existing.photosAfter?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-800 mb-2">After Photos</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {existing.photosAfter.map((p,i)=>(<img key={i} src={p.url} alt="after" className="rounded-lg border border-gray-200 object-cover w-full h-52" loading="lazy" />))}
              </div>
            </div>
          )}
          {canConfirmClose && (
            <div className="pt-2">
              <button onClick={async ()=>{ try{ await updateReport(existing._id,{ status:'closed', byUserId: user.publicMetadata?.mongoId || user.id, action:'reporter confirmed closure' }); notify('Report closed','success'); const fresh= await getReportById(existing._id); setExisting(fresh);}catch(e){ notify('Failed to confirm','error'); } }} className="px-4 h-10 rounded-lg bg-emerald-600 text-white text-sm font-medium shadow hover:bg-emerald-500">Confirm Closure</button>
            </div>
          )}
          {/* Actions */}
          <div className="pt-4 border-t border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Officer Actions</h3>
              {loadingActions && <span className="text-xs text-gray-500">Loading...</span>}
            </div>
            {actions.length === 0 && !loadingActions && <div className="text-xs text-gray-500">No actions recorded yet.</div>}
            {actions.length > 0 && (
              <ul className="space-y-3">
                {actions.map(a => (
                  <li key={a._id} className="rounded-md border border-gray-200 p-3 bg-gray-50/60">
                    <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                      <span>{new Date(a.createdAt).toLocaleString()}</span>
                      <span className="font-medium text-gray-600">{a.officer?.name}</span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{a.note || '(no note)'}</p>
                    {a.photos?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {a.photos.map((p,i)=>(<img key={i} src={p.url} alt="action" className="h-20 w-24 object-cover rounded border border-gray-200" loading="lazy" />))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {isOfficer && (
              <form onSubmit={submitAction} className="space-y-3 bg-white/70 rounded-lg border border-gray-200 p-3">
                <textarea value={actionNote} onChange={e=>setActionNote(e.target.value)} rows={3} className="w-full text-sm rounded-md border border-gray-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Add action note..." />
                <input value={actionPhotos} onChange={e=>setActionPhotos(e.target.value)} className="w-full text-sm rounded-md border border-gray-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Photo URLs (comma separated)" />
                <div className="flex items-center gap-3">
                  <button disabled={creatingAction} className="px-4 h-10 rounded-md bg-indigo-600 text-white text-sm font-medium shadow disabled:opacity-50">{creatingAction?'Saving...':'Add Action'}</button>
                  <button type="button" onClick={()=>{setActionNote('');setActionPhotos('');}} className="text-xs text-gray-600 hover:underline">Reset</button>
                </div>
              </form>
            )}
          </div>
          {/* Audit Logs */}
          <div className="pt-4 border-t border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Audit Trail</h3>
              {loadingLogs && <span className="text-xs text-gray-500">Loading...</span>}
            </div>
            {auditLogs.length === 0 && !loadingLogs && <div className="text-xs text-gray-500">No audit logs.</div>}
            {auditLogs.length > 0 && (
              <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {auditLogs.map(l => (
                  <li key={l._id} className="text-xs flex flex-col bg-gray-50/60 border border-gray-200 rounded-md px-2 py-1.5">
                    <span className="font-medium text-gray-700">{l.user?.name || 'User'}</span>
                    <span className="text-gray-600">{l.action}</span>
                    <span className="text-[10px] text-gray-500 mt-0.5">{new Date(l.createdAt).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in px-3 sm:px-4">
      <style>{`
        .animate-fade-in{animation:fade-in .5s ease both;}
        @keyframes fade-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .animate-in-up{animation:in-up .4s ease both;}
        @keyframes in-up{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .progress-bar{animation:load 1.2s ease-in-out infinite;}
        @keyframes load{0%{transform:translateX(-100%)}50%{transform:translateX(0)}100%{transform:translateX(100%)}}
      `}</style>
      <div>
  <h1 className="text-2xl font-semibold tracking-tight mb-2">Submit a Report</h1>
        <p className="text-sm text-gray-600">Provide detailed information so authorities can act faster.</p>
      </div>
  <form onSubmit={onSubmit} className="relative space-y-6 bg-white/80 dark:bg-white/70 backdrop-blur rounded-xl border border-gray-200 p-6 shadow-sm overflow-hidden">
        {submitting && (
          <div className="absolute top-0 left-0 right-0 h-1 overflow-hidden bg-gradient-to-r from-indigo-200 via-indigo-400/40 to-indigo-200">
            <div className="progress-bar h-full w-1/2 bg-indigo-600/80 blur-[1px]" />
          </div>
        )}
  <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Title<span className="text-rose-500">*</span></label>
            <input name="title" value={form.title} onChange={onChange} required className="w-full h-11 px-3 rounded-lg border border-gray-300 bg-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 text-sm" placeholder="Short summary" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Category <span className="text-xs text-gray-400 font-normal">(optional until classification)</span></label>
            <input name="categoryId" value={form.categoryId} onChange={onChange} className="w-full h-11 px-3 rounded-lg border border-gray-300 bg-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 text-sm" placeholder="Category ID (optional)" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Department <span className="text-xs text-gray-400 font-normal">(optional)</span></label>
            <input name="department" value={form.department} onChange={onChange} className="w-full h-11 px-3 rounded-lg border border-gray-300 bg-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 text-sm" placeholder="Department" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Description<span className="text-rose-500">*</span></label>
              <span className={`text-[11px] ${form.description.length >= maxDescription ? 'text-rose-600 font-medium' : 'text-gray-500'}`}>{form.description.length}/{maxDescription}</span>
            </div>
            <textarea name="description" value={form.description} onChange={onChange} required rows={5} className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 text-sm resize-none" placeholder="Describe the issue, impact, urgency..." />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Photo URLs (comma separated, optional)</label>
            <input name="photosBefore" value={form.photosBefore.join(',')} onChange={(e)=> setForm(f=>({...f, photosBefore: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}))} className="w-full h-11 px-3 rounded-lg border border-gray-300 bg-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 text-sm" placeholder="https://..." />
          </div>
        </div>
        {aiLoading && <div className="text-sm text-indigo-600 font-medium animate-in-up">Analyzing description with AI...</div>}
        {showAIPreview && aiResult && (
          <div className="space-y-3 bg-white/80 rounded-xl border border-indigo-200 p-4 animate-in-up">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">AI Suggested Classification</h3>
              <button type="button" onClick={()=>{ setShowAIPreview(false); setAiResult(null); }} className="text-xs text-gray-500 hover:underline">Re-run</button>
            </div>
            <div className="text-xs text-gray-700">Category: <span className="font-medium text-indigo-600">{aiResult.category?.name || 'Not sure'}</span></div>
            <div className="text-xs text-gray-700">Department: <span className="font-medium">{aiResult.department?.name || '—'}</span></div>
            {aiResult.officers?.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-gray-700">Officer Contacts</div>
                <div className="text-xs text-gray-600 flex flex-col gap-1 max-h-40 overflow-y-auto">
                  {aiResult.officers.map(o => (
                    <div key={o.id} className="flex flex-wrap items-center gap-3 bg-gray-50/70 px-2 py-1 rounded-md border border-gray-200">
                      <span className="font-medium text-gray-800">{o.name}</span>
                      {o.phone && <a href={`tel:${o.phone}`} className="text-indigo-600 hover:underline">{o.phone}</a>}
                      {o.email && <a href={`mailto:${o.email}`} className="text-indigo-600 hover:underline">{o.email}</a>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 pt-1">
              <button type="button" onClick={()=>{ /* accept classification */ setForm(f=>({...f, categoryId: f.categoryId || aiResult.category?.id || '' })); setShowAIPreview(true); notify('Classification applied','success'); }} className="px-3 h-9 rounded-md bg-indigo-600 text-white text-xs font-medium">Accept</button>
              <button type="button" onClick={()=>{ setAiResult(null); setShowAIPreview(false); }} className="text-[11px] text-gray-600 hover:underline">Discard</button>
            </div>
          </div>
        )}
        {error && <div className="text-sm text-rose-600 font-medium animate-in-up">{error}</div>}
        {success && <div className="text-sm text-emerald-600 font-medium animate-in-up">Report submitted successfully!</div>}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <button disabled={submitting || aiLoading} type="submit" className="relative inline-flex items-center justify-center gap-2 px-5 h-11 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition active:scale-95">
            {(submitting || aiLoading) && <span className="absolute left-4 inline-block h-4 w-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />}
            <span>{showAIPreview ? (submitting ? 'Submitting...' : 'Confirm & Submit') : (aiLoading ? 'Analyzing...' : 'Analyze & Continue')}</span>
          </button>
          <button type="button" disabled={submitting} onClick={()=>setForm({ title:'', description:'', categoryId:'', department:'', photosBefore: [] })} className="inline-flex items-center justify-center px-4 h-11 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 active:scale-95 transition disabled:opacity-50">Reset</button>
          <p className="text-xs text-gray-500 sm:ml-auto">Fields marked * are required.</p>
        </div>
      </form>
    </div>
  );
};

export default Report;