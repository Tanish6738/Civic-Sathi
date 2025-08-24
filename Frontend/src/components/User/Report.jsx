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
    if (loadingExisting) return <div className="text-sm text-soft">Loading report...</div>;
    if (!existing) return <div className="text-sm text-soft">Report not found.</div>;
    const canConfirmClose = existing.status === STATUS_CLOSE_CONFIRM && (user.publicMetadata?.mongoId === existing.reporter?._id || user.id === existing.reporter?._id);
    return (
      <div className="max-w-4xl mx-auto space-y-8 px-3 sm:px-4">
        {/* Header */}
        <section className="relative overflow-hidden rounded-3xl border border-[rgb(var(--ds-border))] bg-gradient-to-br from-[rgb(var(--ds-primary))] via-[rgb(var(--ds-secondary))] to-[rgb(var(--ds-primary))] text-white shadow-elevate">
          <div className="absolute inset-0 opacity-[0.15] bg-[radial-gradient(circle_at_30%_35%,white,transparent_60%)]" />
          <div className="relative p-8 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex-1 min-w-0 truncate" title={existing.title}>{existing.title}</h1>
              <span className="text-[11px] font-semibold px-2 py-1 rounded-md ring-1 ring-white/30 bg-white/15 backdrop-blur-md">{existing.category?.name || 'Uncategorized'}</span>
              <span className="text-[11px] font-semibold px-2 py-1 rounded-md bg-white/15 ring-1 ring-white/30 backdrop-blur-md">{existing.status}</span>
            </div>
            <p className="text-xs font-medium text-white/80">Submitted {new Date(existing.createdAt).toLocaleString()}</p>
          </div>
        </section>

        {/* Body */}
        <section className="space-y-8">
          <div className="relative rounded-2xl border border-[rgb(var(--ds-border))] bg-[rgb(var(--ds-surface))]/85 backdrop-blur-xl p-6 shadow-sm space-y-6">
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-[rgb(var(--ds-text))]">{existing.description}</p>
            {(existing.photosBefore?.length > 0 || existing.photosAfter?.length > 0) && (
              <div className="grid gap-8 md:grid-cols-2">
                {existing.photosBefore?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-soft mb-3">Before Photos</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {existing.photosBefore.map((p,i)=>(<img key={i} src={p.url} alt="before" className="rounded-xl border border-[rgb(var(--ds-border))] object-cover w-full h-52 shadow-sm" loading="lazy" />))}
                    </div>
                  </div>
                )}
                {existing.photosAfter?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-soft mb-3">After Photos</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {existing.photosAfter.map((p,i)=>(<img key={i} src={p.url} alt="after" className="rounded-xl border border-[rgb(var(--ds-border))] object-cover w-full h-52 shadow-sm" loading="lazy" />))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {canConfirmClose && (
              <div className="pt-2">
                <button
                  onClick={async ()=>{ try{ await updateReport(existing._id,{ status:'closed', byUserId: user.publicMetadata?.mongoId || user.id, action:'reporter confirmed closure' }); notify('Report closed','success'); const fresh= await getReportById(existing._id); setExisting(fresh);}catch(e){ notify('Failed to confirm','error'); } }}
                  className="px-5 h-11 rounded-xl bg-gradient-to-r from-[rgb(var(--ds-success))] to-[rgb(var(--ds-teal))] text-white text-sm font-semibold shadow hover:brightness-110 active:scale-[.97] transition"
                >
                  Confirm Closure
                </button>
              </div>
            )}
            {/* Actions */}
            <div className="pt-4 border-t border-[rgb(var(--ds-border))] space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold tracking-wide text-[rgb(var(--ds-text))]">Officer Actions</h3>
                {loadingActions && <span className="text-[11px] text-soft">Loading...</span>}
              </div>
              {actions.length === 0 && !loadingActions && <div className="text-xs text-soft">No actions recorded yet.</div>}
              {actions.length > 0 && (
                <ul className="space-y-4">
                  {actions.map(a => (
                    <li key={a._id} className="relative rounded-xl border border-[rgb(var(--ds-border))] bg-[rgba(var(--ds-muted),0.6)] p-4 shadow-sm">
                      <div className="flex items-center justify-between text-[10px] text-soft mb-1">
                        <span>{new Date(a.createdAt).toLocaleString()}</span>
                        <span className="font-semibold text-[rgb(var(--ds-text))]">{a.officer?.name}</span>
                      </div>
                      <p className="text-sm text-[rgb(var(--ds-text))] whitespace-pre-wrap">{a.note || '(no note)'}</p>
                      {a.photos?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {a.photos.map((p,i)=>(<img key={i} src={p.url} alt="action" className="h-24 w-28 object-cover rounded-lg border border-[rgb(var(--ds-border))]" loading="lazy" />))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {isOfficer && (
                <form onSubmit={submitAction} className="space-y-3 bg-[rgb(var(--ds-surface))]/80 rounded-xl border border-[rgb(var(--ds-border))] p-4 shadow-sm">
                  <textarea value={actionNote} onChange={e=>setActionNote(e.target.value)} rows={3} className="w-full text-sm rounded-lg border border-[rgb(var(--ds-border))] px-3 py-2 bg-[rgb(var(--ds-surface))] focus:outline-none focus:ring-4 focus:ring-[rgba(var(--ds-ring),0.35)]" placeholder="Add action note..." />
                  <input value={actionPhotos} onChange={e=>setActionPhotos(e.target.value)} className="w-full text-sm rounded-lg border border-[rgb(var(--ds-border))] px-3 py-2 bg-[rgb(var(--ds-surface))] focus:outline-none focus:ring-4 focus:ring-[rgba(var(--ds-ring),0.35)]" placeholder="Photo URLs (comma separated)" />
                  <div className="flex items-center gap-4">
                    <button disabled={creatingAction} className="px-5 h-10 rounded-lg bg-gradient-to-r from-[rgb(var(--ds-primary))] to-[rgb(var(--ds-secondary))] text-white text-xs font-semibold shadow hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-[.97]">{creatingAction?'Saving…':'Add Action'}</button>
                    <button type="button" onClick={()=>{setActionNote('');setActionPhotos('');}} className="text-[11px] font-medium text-soft hover:text-[rgb(var(--ds-primary))] transition">Reset</button>
                  </div>
                </form>
              )}
            </div>
            {/* Audit Logs */}
            <div className="pt-4 border-t border-[rgb(var(--ds-border))] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold tracking-wide text-[rgb(var(--ds-text))]">Audit Trail</h3>
                {loadingLogs && <span className="text-[11px] text-soft">Loading...</span>}
              </div>
              {auditLogs.length === 0 && !loadingLogs && <div className="text-xs text-soft">No audit logs.</div>}
              {auditLogs.length > 0 && (
                <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {auditLogs.map(l => (
                    <li key={l._id} className="text-xs flex flex-col bg-[rgba(var(--ds-muted),0.7)] border border-[rgb(var(--ds-border))] rounded-md px-3 py-2">
                      <span className="font-semibold text-[rgb(var(--ds-text))]">{l.user?.name || 'User'}</span>
                      <span className="text-soft">{l.action}</span>
                      <span className="text-[10px] text-soft mt-0.5">{new Date(l.createdAt).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
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
        <h1 className="text-2xl font-semibold tracking-tight mb-2 text-gradient-primary">Submit a Report</h1>
        <p className="text-sm text-soft">Provide detailed information so authorities can act faster.</p>
      </div>
      <form onSubmit={onSubmit} className="relative space-y-7 bg-[rgb(var(--ds-surface))]/85 backdrop-blur-xl rounded-2xl border border-[rgb(var(--ds-border))] p-6 shadow-elevate overflow-hidden">
        {submitting && (
          <div className="absolute top-0 left-0 right-0 h-1 overflow-hidden bg-gradient-to-r from-[rgba(var(--ds-primary),0.25)] via-[rgba(var(--ds-secondary),0.35)] to-[rgba(var(--ds-primary),0.25)]">
            <div className="progress-bar h-full w-1/2 bg-[rgb(var(--ds-primary))] blur-[1px]" />
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-soft">Title<span className="text-[rgb(var(--ds-error))]">*</span></label>
            <input name="title" value={form.title} onChange={onChange} required className="w-full h-12 px-3 rounded-xl border border-[rgb(var(--ds-border))] bg-[rgb(var(--ds-surface))] focus:outline-none focus:ring-4 focus:ring-[rgba(var(--ds-ring),0.35)] focus:border-[rgb(var(--ds-primary))] text-sm font-medium" placeholder="Short summary" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-soft">Category <span className="text-[10px] text-soft font-normal">(optional)</span></label>
            <input name="categoryId" value={form.categoryId} onChange={onChange} className="w-full h-12 px-3 rounded-xl border border-[rgb(var(--ds-border))] bg-[rgb(var(--ds-surface))] focus:outline-none focus:ring-4 focus:ring-[rgba(var(--ds-ring),0.35)] focus:border-[rgb(var(--ds-primary))] text-sm font-medium" placeholder="Category ID (optional)" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-soft">Department <span className="text-[10px] text-soft font-normal">(optional)</span></label>
            <input name="department" value={form.department} onChange={onChange} className="w-full h-12 px-3 rounded-xl border border-[rgb(var(--ds-border))] bg-[rgb(var(--ds-surface))] focus:outline-none focus:ring-4 focus:ring-[rgba(var(--ds-ring),0.35)] focus:border-[rgb(var(--ds-primary))] text-sm font-medium" placeholder="Department" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide text-soft">Description<span className="text-[rgb(var(--ds-error))]">*</span></label>
              <span className={`text-[10px] font-medium ${form.description.length >= maxDescription ? 'text-[rgb(var(--ds-error))]' : 'text-soft'}`}>{form.description.length}/{maxDescription}</span>
            </div>
            <textarea name="description" value={form.description} onChange={onChange} required rows={5} className="w-full px-3 py-2 rounded-2xl border border-[rgb(var(--ds-border))] bg-[rgb(var(--ds-surface))] focus:outline-none focus:ring-4 focus:ring-[rgba(var(--ds-ring),0.35)] focus:border-[rgb(var(--ds-primary))] text-sm resize-none leading-relaxed" placeholder="Describe the issue, impact, urgency..." />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-soft">Photo URLs <span className="text-[10px] text-soft font-normal">(optional, comma separated)</span></label>
            <input name="photosBefore" value={form.photosBefore.join(',')} onChange={(e)=> setForm(f=>({...f, photosBefore: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}))} className="w-full h-12 px-3 rounded-xl border border-[rgb(var(--ds-border))] bg-[rgb(var(--ds-surface))] focus:outline-none focus:ring-4 focus:ring-[rgba(var(--ds-ring),0.35)] focus:border-[rgb(var(--ds-primary))] text-sm font-medium" placeholder="https://..." />
          </div>
        </div>
        {aiLoading && <div className="text-sm text-[rgb(var(--ds-primary))] font-medium animate-in-up">Analyzing description with AI...</div>}
        {showAIPreview && aiResult && (
          <div className="space-y-4 bg-[rgb(var(--ds-surface))]/90 rounded-2xl border border-[rgba(var(--ds-primary),0.35)] p-5 animate-in-up shadow-md relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-[rgba(var(--ds-primary),0.08)] to-transparent" />
            <div className="relative flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-wide text-[rgb(var(--ds-text))]">AI Suggested Classification</h3>
              <button type="button" onClick={()=>{ setShowAIPreview(false); setAiResult(null); }} className="text-[11px] font-medium text-soft hover:text-[rgb(var(--ds-primary))] transition">Re-run</button>
            </div>
            <div className="relative grid gap-3 md:grid-cols-2 text-[11px] font-medium">
              <div className="p-3 rounded-lg bg-[rgba(var(--ds-muted),0.6)] border border-[rgb(var(--ds-border))]">
                <div className="text-soft uppercase tracking-wide text-[10px]">Category</div>
                <div className="text-[rgb(var(--ds-primary))] font-semibold mt-1">{aiResult.category?.name || 'Not sure'}</div>
              </div>
              <div className="p-3 rounded-lg bg-[rgba(var(--ds-muted),0.6)] border border-[rgb(var(--ds-border))]">
                <div className="text-soft uppercase tracking-wide text-[10px]">Department</div>
                <div className="font-semibold mt-1">{aiResult.department?.name || '—'}</div>
              </div>
            </div>
            {aiResult.officers?.length > 0 && (
              <div className="relative space-y-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-soft">Officer Contacts</div>
                <div className="flex flex-col gap-2 max-h-44 overflow-y-auto pr-1">
                  {aiResult.officers.map(o => (
                    <div key={o.id} className="flex flex-wrap items-center gap-3 bg-[rgba(var(--ds-muted),0.65)] px-3 py-2 rounded-lg border border-[rgb(var(--ds-border))] text-[11px] font-medium">
                      <span className="font-semibold text-[rgb(var(--ds-text))]">{o.name}</span>
                      {o.phone && <a href={`tel:${o.phone}`} className="text-[rgb(var(--ds-primary))] hover:underline">{o.phone}</a>}
                      {o.email && <a href={`mailto:${o.email}`} className="text-[rgb(var(--ds-primary))] hover:underline">{o.email}</a>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="relative flex items-center gap-4 pt-1">
              <button type="button" onClick={()=>{ setForm(f=>({...f, categoryId: f.categoryId || aiResult.category?.id || '' })); setShowAIPreview(true); notify('Classification applied','success'); }} className="px-4 h-10 rounded-lg bg-gradient-to-r from-[rgb(var(--ds-primary))] to-[rgb(var(--ds-secondary))] text-white text-xs font-semibold shadow hover:brightness-110 active:scale-[.97]">Accept</button>
              <button type="button" onClick={()=>{ setAiResult(null); setShowAIPreview(false); }} className="text-[11px] font-medium text-soft hover:text-[rgb(var(--ds-error))] transition">Discard</button>
            </div>
          </div>
        )}
        {error && <div className="text-sm font-medium text-[rgb(var(--ds-error))] animate-in-up bg-[rgba(var(--ds-error),0.08)] border border-[rgba(var(--ds-error),0.4)] rounded-md px-3 py-2">{error}</div>}
        {success && <div className="text-sm font-medium text-[rgb(var(--ds-success))] animate-in-up bg-[rgba(var(--ds-success),0.12)] border border-[rgba(var(--ds-success),0.4)] rounded-md px-3 py-2">Report submitted successfully!</div>}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <button disabled={submitting || aiLoading} type="submit" className="relative inline-flex items-center justify-center gap-2 px-6 h-12 rounded-xl bg-gradient-to-r from-[rgb(var(--ds-primary))] via-[rgb(var(--ds-secondary))] to-[rgb(var(--ds-primary))] text-white text-sm font-semibold shadow hover:brightness-110 disabled:opacity-55 disabled:cursor-not-allowed transition active:scale-[.97] focus:outline-none focus:ring-4 focus:ring-[rgba(var(--ds-ring),0.4)]">
            {(submitting || aiLoading) && <span className="absolute left-4 inline-block h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            <span>{showAIPreview ? (submitting ? 'Submitting…' : 'Confirm & Submit') : (aiLoading ? 'Analyzing…' : 'Analyze & Continue')}</span>
          </button>
          <button type="button" disabled={submitting} onClick={()=>setForm({ title:'', description:'', categoryId:'', department:'', photosBefore: [] })} className="inline-flex items-center justify-center px-5 h-12 rounded-xl border border-[rgb(var(--ds-border))] text-soft text-sm font-semibold hover:bg-[rgba(var(--ds-primary),0.08)] hover:text-[rgb(var(--ds-primary))] active:scale-[.97] transition disabled:opacity-50">Reset</button>
          <p className="text-[10px] text-soft sm:ml-auto font-medium uppercase tracking-wide">Fields marked * are required.</p>
        </div>
      </form>
    </div>
  );
};

export default Report;