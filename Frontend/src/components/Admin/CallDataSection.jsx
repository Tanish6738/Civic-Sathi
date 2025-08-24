import React, { useMemo, useEffect, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { fetchCallActivity } from '../../services/analytics.services';
import { RefreshCcw } from 'lucide-react';

// Stat card (mobile friendly)
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

const CallDataSection = () => {
  const [dataState, setDataState] = useState(null); // { daily, totals }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load(){
    setLoading(true); setError('');
    try { const d = await fetchCallActivity(); setDataState(d); }
    catch(e){ setError(e?.response?.data?.message || 'Failed to load call activity'); }
    finally { setLoading(false); }
  }
  useEffect(()=>{ load(); },[]);

  const chartData = useMemo(()=> (dataState?.daily || []).map(d=> ({ day: d.day, calls: d.calls, resolved: d.resolved })), [dataState]);
  const totals = dataState?.totals || { totalCalls:0,totalResolved:0,resolutionRate:0,diffCallsPct:null,diffResolvedPct:null,diffResolutionPts:0 };

  return (
    <section className="flex flex-col gap-5" aria-labelledby="call-activity-heading">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <h2 id="call-activity-heading" className="text-base sm:text-lg font-semibold tracking-tight">Call Center Activity</h2>
          <span className="text-[11px] sm:text-xs text-soft">Last 7 days</span>
        </div>
        <div className="flex items-center gap-2 w-full xs:w-auto">
          {error && <span className="text-[10px] text-rose-600 truncate max-w-[160px]" role="alert">{error}</span>}
          <button
            onClick={load}
            disabled={loading}
            className="flex-1 xs:flex-none h-9 px-3 rounded-md btn btn-primary text-xs font-medium flex items-center justify-center gap-1 disabled:opacity-50"
            aria-label="Refresh call center activity"
          >
            <RefreshCcw size={14} className={loading? 'animate-spin':''}/>
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </header>

      {/* Stats (stack on mobile) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="Total Calls" value={totals.totalCalls} diff={totals.diffCallsPct} diffLabel="vs prev." />
        <StatCard label="Resolved" value={totals.totalResolved} diff={totals.diffResolvedPct} diffLabel="vs prev." />
        <StatCard label="Resolution Rate" value={totals.resolutionRate + '%'} diff={totals.diffResolutionPts} diffLabel="pts" />
      </div>

      {/* Chart wrapper: adapt height & allow horizontal scroll if squished */}
  <div className="rounded-xl border border-default bg-surface-trans p-2 sm:p-3 shadow-sm">
        <div className="relative h-56 sm:h-72 w-full overflow-hidden">
          {(!chartData.length && !loading) && (
    <div className="absolute inset-0 flex items-center justify-center text-xs text-soft">No data available</div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="callsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.55}/>
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="resolvedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.55}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#94a3b8" height={28} />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" width={40} />
              <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} className="hidden sm:block" />
              <Area type="monotone" dataKey="calls" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#callsGradient)" />
              <Area type="monotone" dataKey="resolved" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#resolvedGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {loading && <p className="mt-2 text-[10px] text-gray-500">Updating...</p>}
      </div>
    </section>
  );
};

export default CallDataSection;
