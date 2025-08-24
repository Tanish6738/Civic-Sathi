import React, { useEffect, useState } from 'react';
import { getOfficerHistory } from '../../services/officer.services';

export default function OfficerReportHistory() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load(p=1) {
    setLoading(true); setError(null);
    const res = await getOfficerHistory({ page: p });
    if (res.error) setError(res.error); else {
      setItems(res.data.items || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setPage(res.data.pagination?.page || 1);
    }
    setLoading(false);
  }
  useEffect(()=> { load(1); }, []);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">History</h1>
      <div className="rounded-lg border border-default overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-soft/60">
              <th className="py-2 px-2">Title</th>
              <th className="py-2 px-2">Status</th>
              <th className="py-2 px-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={3} className="py-6 text-center text-soft/60">Loading...</td></tr>}
            {!loading && items.length===0 && <tr><td colSpan={3} className="py-6 text-center text-soft/60">No history entries</td></tr>}
            {!loading && items.map(r => (
              <tr key={r._id} className="border-t border-default/50">
                <td className="py-2 px-2 max-w-[200px] truncate">{r.title}</td>
                <td className="py-2 px-2"><span className="px-2 py-0.5 rounded-full bg-surface-100 text-soft text-xs border border-default capitalize">{r.status}</span></td>
                <td className="py-2 px-2 text-soft/70">{new Date(r.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-center gap-2 pt-2">
        <button disabled={page<=1} onClick={()=> load(page-1)} className="h-8 px-3 rounded-md border border-default bg-surface text-xs disabled:opacity-40">Prev</button>
        <div className="h-8 px-3 inline-flex items-center rounded-md text-xs bg-surface border border-default">Page {page} / {totalPages}</div>
        <button disabled={page>=totalPages} onClick={()=> load(page+1)} className="h-8 px-3 rounded-md border border-default bg-surface text-xs disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
