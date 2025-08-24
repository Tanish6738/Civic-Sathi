import React, { useMemo, useEffect, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { fetchWebComplaints } from '../../services/analytics.services';
import { RefreshCcw } from 'lucide-react';

const StatCard = ({ label, value, diff, diffLabel }) => {
  const diffColor = diff > 0
    ? 'text-green-600 bg-success-soft'
    : diff < 0
      ? 'text-red-600 bg-error-soft'
      : 'text-soft bg-muted';
  const sign = diff > 0 ? '+' : '';
  return (
    <div className="rounded-xl border border-default bg-surface-trans shadow-sm px-4 py-3 flex items-start justify-between gap-4">
      <div className="flex flex-col">
        <span className="text-[11px] uppercase tracking-wide text-soft font-medium">{label}</span>
        <span className="text-xl sm:text-2xl font-semibold tracking-tight leading-tight">{value}</span>
      </div>
      {diff !== undefined && diff !== null && (
        <span className={`text-[10px] sm:text-xs font-medium px-2 py-1 rounded-full ${diffColor}`}>{sign}{diff}{diffLabel === 'pts' ? '' : '%'} <span className="hidden sm:inline">{diffLabel}</span></span>
      )}
    </div>
  );
};

const COLORS = ['#6366F1', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6'];

const WebComplaintsSection = () => {
  const [dataState, setDataState] = useState(null); // { daily, totals, categoryBreakdown }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load(){
    setLoading(true); setError('');
    try { const d = await fetchWebComplaints(); setDataState(d); }
    catch(e){ setError(e?.response?.data?.message || 'Failed to load web complaints'); }
    finally { setLoading(false); }
  }
  useEffect(()=>{ load(); },[]);

  const complaints = useMemo(()=> (dataState?.daily || []).map(d=> ({ day: d.day, total: d.total, open: d.open, closed: d.closed })), [dataState]);
  const categoryBreakdown = dataState?.categoryBreakdown || [];
  const totals = dataState?.totals || { total:0, open:0, closed:0, closeRate:0, diffTotalPct:null, diffClosedPct:null, diffCloseRatePts:0 };

  return (
    <section className="flex flex-col gap-5" aria-labelledby="web-complaints-heading">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <h2 id="web-complaints-heading" className="text-base sm:text-lg font-semibold tracking-tight">Web Complaints</h2>
          <span className="text-[11px] sm:text-xs text-soft">Last 7 days</span>
        </div>
        <div className="flex items-center gap-2 w-full xs:w-auto">
          {error && <span className="text-[10px] text-rose-600 truncate max-w-[160px]" role="alert">{error}</span>}
          <button
            onClick={load}
            disabled={loading}
            className="flex-1 xs:flex-none h-9 px-3 rounded-md btn btn-primary text-xs font-medium flex items-center justify-center gap-1 disabled:opacity-50"
            aria-label="Refresh web complaints"
          >
            <RefreshCcw size={14} className={loading? 'animate-spin':''}/>
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total Complaints" value={totals.total} diff={totals.diffTotalPct} diffLabel="vs prev." />
        <StatCard label="Open" value={totals.open} />
        <StatCard label="Closed" value={totals.closed} diff={totals.diffClosedPct} diffLabel="vs prev." />
        <StatCard label="Close Rate" value={totals.closeRate + '%'} diff={totals.diffCloseRatePts} diffLabel="pts" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
    <div className="rounded-xl border border-default bg-surface-trans p-2 sm:p-3 shadow-sm xl:col-span-2">
          <div className="relative h-56 sm:h-72 w-full">
            {(!complaints.length && !loading) && (
      <div className="absolute inset-0 flex items-center justify-center text-xs text-soft">No data available</div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={complaints} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#94a3b8" height={28} />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" width={40} />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} className="hidden sm:block" />
                <Bar dataKey="open" stackId="a" fill="#F59E0B" radius={[4,4,0,0]} />
                <Bar dataKey="closed" stackId="a" fill="#10B981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
      {loading && <p className="mt-2 text-[10px] text-soft">Updating...</p>}
        </div>
    <div className="rounded-xl border border-default bg-surface-trans p-2 sm:p-3 shadow-sm flex flex-col items-center justify-center">
          <div className="relative h-56 sm:h-72 w-full">
            {(!categoryBreakdown.length && !loading) && (
      <div className="absolute inset-0 flex items-center justify-center text-xs text-soft">No categories</div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryBreakdown} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={3}>
                  {categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
                <Legend wrapperStyle={{ fontSize: '11px' }} className="hidden sm:block" />
              </PieChart>
            </ResponsiveContainer>
          </div>
      {loading && <p className="mt-2 text-[10px] text-soft">Updating...</p>}
        </div>
      </div>
    </section>
  );
};

export default WebComplaintsSection;
