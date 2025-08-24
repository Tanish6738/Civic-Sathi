import React, { useEffect, useState } from 'react';
import { submitForVerification, misrouteReport, uploadAfterPhotos } from '../../services/officer.services';
import AfterPhotosUploader from './AfterPhotosUploader';
import MisrouteDialog from './MisrouteDialog';
import api from '../../utils/axios';

export default function OfficerReportDetail({ reportId, onClose, onChanged }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMisroute, setShowMisroute] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await api.get(`/reports/${reportId}`); // reuse general endpoint
      setReport(res.data.data || res.data);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally { setLoading(false); }
  }
  useEffect(()=> { load(); }, [reportId]);

  async function handlePhotos(list) {
    // Only send URLs for now (future: upload pipeline)
    const urls = list.map(p=> p.url);
    await uploadAfterPhotos(reportId, urls);
    await load(); onChanged && onChanged();
  }

  async function handleSubmitVerification() {
    setSubmitting(true);
    const res = await submitForVerification(reportId);
    setSubmitting(false);
    if (!res.error) { await load(); onChanged && onChanged(); }
  }

  async function handleMisroute(reason) {
    setSubmitting(true);
    const res = await misrouteReport(reportId, { reason });
    setSubmitting(false); setShowMisroute(false);
    if (!res.error) { onChanged && onChanged(); onClose && onClose(); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-2">
      <div className="w-full max-w-3xl bg-surface rounded-lg border border-default shadow-xl flex flex-col max-h-[95vh] overflow-hidden">
        <div className="flex items-center justify-between px-4 h-12 border-b border-default">
          <h2 className="text-sm font-semibold tracking-wide">Report Detail</h2>
          <button onClick={onClose} className="text-soft hover:text-primary text-sm">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-sm">
          {loading && <div className="py-10 text-center text-soft/60">Loading...</div>}
          {error && <div className="py-10 text-center text-danger">{error}</div>}
          {report && (
            <>
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold leading-tight">{report.title}</h3>
                <div className="text-xs text-soft/60 flex flex-wrap gap-2">
                  <span className="px-2 py-0.5 bg-primary/15 text-primary rounded-full font-medium">{report.status}</span>
                  {report.category && <span className="px-2 py-0.5 bg-surface-100 border border-default text-soft rounded-full">{report.category.name}</span>}
                </div>
                <p className="mt-2 whitespace-pre-wrap leading-relaxed text-soft/90">{report.description}</p>
              </div>
              <div className="flex flex-col gap-2">
                <h4 className="text-sm font-semibold">Before Photos</h4>
                <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 gap-2">
                  {(report.photosBefore||[]).map((p,i)=>(<img key={i} src={p.url} alt="before" className="rounded-md object-cover aspect-square w-full h-full border border-default" />))}
                  {(!report.photosBefore || report.photosBefore.length===0) && <div className="col-span-full text-xs text-soft/60">None</div>}
                </div>
              </div>
              <AfterPhotosUploader value={report.photosAfter?.map(p=> ({ url: p.url }))} onChange={handlePhotos} />
              <div className="flex flex-wrap gap-2 pt-2">
                {['in_progress'].includes(report.status) && (
                  <button disabled={submitting || (report.photosAfter||[]).length===0} onClick={handleSubmitVerification} className="h-9 px-4 rounded-md bg-primary text-white text-xs font-medium disabled:opacity-50">{submitting ? 'Submitting...' : 'Submit for Verification'}</button>
                )}
                {['in_progress'].includes(report.status) && (
                  <button disabled={submitting} onClick={()=> setShowMisroute(true)} className="h-9 px-4 rounded-md bg-danger text-white text-xs font-medium disabled:opacity-50">Flag Misrouted</button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <MisrouteDialog open={showMisroute} onClose={()=> setShowMisroute(false)} onSubmit={handleMisroute} loading={submitting} />
    </div>
  );
}
