import React, { useEffect, useState, useMemo } from 'react';
import { fetchAnalytics } from '../../services/analytics.services';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid, AreaChart, Area } from 'recharts';
import { RefreshCcw, AlertTriangle, Eye, EyeOff } from 'lucide-react';

const STATUS_COLORS = ['#6366F1','#EF4444','#F59E0B','#10B981','#8B5CF6','#0EA5E9','#64748B'];

export default function AnalyticsDashboard(){
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rangeDays, setRangeDays] = useState(90);
  const [granularity, setGranularity] = useState('day');
  const [compare, setCompare] = useState(false);
  const [seriesMode, setSeriesMode] = useState('reports'); // reports | closedRate | backlog
  const [officerPage, setOfficerPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const [showRaw, setShowRaw] = useState(false);
  const OFFICER_PAGE_SIZE = 10;
  const USER_PAGE_SIZE = 10;

  async function load(){
    setLoading(true); setError('');
    try { const insights = await fetchAnalytics({ rangeDays, granularity, compare }); setData(insights); }
    catch(e){ setError(e?.response?.data?.message || 'Failed to load analytics'); }
    finally { setLoading(false); }
  }
  useEffect(()=>{ load(); },[rangeDays, granularity, compare]);

  const statusChart = useMemo(()=> (data?.countsByStatus || []).map((d,i)=> ({...d, fill: STATUS_COLORS[i % STATUS_COLORS.length]})), [data]);
  // Category trend data must be declared before any conditional returns to keep hook order stable
  const categoryTrendData = useMemo(()=>{
    if(!data?.categoryTrends) return [];
    const maps = (data.categoryTrends || []).map(c=> ({ name:c.category, entries: new Map(c.series.map(s=> [s.period, s.count])) }));
    const periodSet = new Set();
    maps.forEach(m=> m.entries.forEach((_,k)=> periodSet.add(k)));
    const periods = [...periodSet].sort((a,b)=> a.localeCompare(b));
    return periods.map(p=> {
      const row = { period:p };
      maps.forEach(m=> { row[m.name] = m.entries.get(p) || 0; });
      return row;
    });
  },[data]);

  if (loading && !data) return <div className="p-4 text-sm">Loading analytics...</div>;
  if (error && !data) return <div className="p-4 text-sm text-rose-600">{error}</div>;
  if (!data) return null;

  // Derived paginated slices
  const officerTotal = (data.officerPerformance || []).length;
  const officerTotalPages = Math.max(1, Math.ceil(officerTotal / OFFICER_PAGE_SIZE));
  const safeOfficerPage = Math.min(officerPage, officerTotalPages);
  const officerItems = (data.officerPerformance || []).slice((safeOfficerPage-1)*OFFICER_PAGE_SIZE, safeOfficerPage*OFFICER_PAGE_SIZE);

  const userTotal = (data.userActivity || []).length;
  const userTotalPages = Math.max(1, Math.ceil(userTotal / USER_PAGE_SIZE));
  const safeUserPage = Math.min(userPage, userTotalPages);
  const userItems = (data.userActivity || []).slice((safeUserPage-1)*USER_PAGE_SIZE, safeUserPage*USER_PAGE_SIZE);

  // Derived time series for selected mode
  const timeSeries = (data.timeSeries||[]).map(p=> ({
    period: p.period,
    newReports: p.newReports,
    closed: p.closed,
    closeRate: p.newReports? +(p.closed/p.newReports*100).toFixed(1) : 0
  }));
  const backlogAging = Object.entries(data.backlogSummary?.agingBuckets||{}).map(([bucket,value])=>({ bucket,value }));
  const closureStats = data.closureStats || { avgHours:0, medianHours:0, p90Hours:0, count:0 };

  // (categoryTrendData hook moved earlier to maintain consistent hook count)

  const categoryNames = (data.categoryTrends || []).map(c=> c.category);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">AI Report Analytics</h2>
          <p className="text-xs text-gray-500">Generated {new Date(data.generatedAt || Date.now()).toLocaleString()} {data.model && <span className="ml-1">(model: {data.model})</span>}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={rangeDays} onChange={e=> setRangeDays(+e.target.value)} className="h-9 text-xs border rounded-md px-2 bg-white">
            {[30,60,90,180,365].map(v=> <option key={v} value={v}>{v}d</option>)}
          </select>
          <select value={granularity} onChange={e=> setGranularity(e.target.value)} className="h-9 text-xs border rounded-md px-2 bg-white">
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
          <label className="flex items-center gap-1 text-[11px] select-none">
            <input type="checkbox" checked={compare} onChange={e=> setCompare(e.target.checked)} /> Compare
          </label>
          <button onClick={load} disabled={loading} className="h-9 px-3 rounded-md btn btn-primary text-white text-xs font-medium flex items-center gap-1 disabled:opacity-50"><RefreshCcw size={14} className={loading?'animate-spin':''}/> Refresh</button>
          <button onClick={()=> setShowRaw(r=> !r)} className="h-9 px-3 rounded-md border text-xs font-medium flex items-center gap-1">
            {showRaw? <EyeOff size={14}/> : <Eye size={14}/>}
            {showRaw? 'Hide Raw' : 'Raw JSON'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Stat label="Total Reports" value={data.totalReports || 0} />
        <Stat label="Open Backlog" value={data.backlogSummary?.open || 0} />
        <Stat label="Closure Avg (h)" value={closureStats.avgHours} />
        <Stat label="Closure P90 (h)" value={closureStats.p90Hours} />
        <Stat label="Top Category" value={data.topCategories?.[0]?.category || '—'} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        <Card title="Reports by Status">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusChart} dataKey="count" nameKey="status" outerRadius={110} label={(p)=>p.status}>
                  {statusChart.map((s)=>(<Cell key={s.status} fill={s.fill}/>))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
  <Card title="Reports by Department" className="xl:col-span-2">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.departmentLoad || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366F1" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <Card title={`Time Series (${granularity})`}>
          <div className="flex gap-2 text-[10px] mb-2">
            {['reports','closedRate','backlog'].map(m=> <button key={m} onClick={()=> setSeriesMode(m)} className={`px-2 py-1 rounded border ${seriesMode===m? 'bg-indigo-600 text-white':'bg-white'}`}>{m}</button>)}
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {seriesMode==='backlog'? (
                <BarChart data={backlogAging}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200"/>
                  <XAxis dataKey="bucket" tick={{ fontSize:10 }} />
                  <YAxis tick={{ fontSize:10 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#F59E0B" radius={[4,4,0,0]} />
                </BarChart>
              ) : (
                <LineChart data={timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(timeSeries.length/12))} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  {seriesMode==='reports' && <>
                    <Line type="monotone" dataKey="newReports" stroke="#10B981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="closed" stroke="#6366F1" strokeWidth={2} dot={false} />
                  </>}
                  {seriesMode==='closedRate' && <Line type="monotone" dataKey="closeRate" stroke="#EF4444" strokeWidth={2} dot={false} />}
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
          {data.comparison && (
            <div className="mt-2 text-[11px] text-gray-600 flex flex-wrap gap-3">
              <span>Current: {data.comparison.current.total}</span>
              <span>Prev: {data.comparison.previous.total}</span>
              <span>Diff: {data.comparison.diffTotal} ({data.comparison.diffPct ?? '—'}%)</span>
            </div>
          )}
        </Card>
  <Card title="Top Officers (by closed)">
          <div className="overflow-auto max-h-64">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
                  <th className="px-2 py-1">Officer</th>
                  <th className="px-2 py-1">Assigned</th>
                  <th className="px-2 py-1">Closed</th>
                  <th className="px-2 py-1">Close %</th>
                  <th className="px-2 py-1">Avg Hrs</th>
                </tr>
              </thead>
              <tbody>
                {officerItems.map(o => (
                  <tr key={o.officerId} className="border-b last:border-none border-gray-100">
                    <td className="px-2 py-1 font-medium text-gray-800">{o.officer}</td>
                    <td className="px-2 py-1">{o.assigned}</td>
                    <td className="px-2 py-1">{o.closed}</td>
                    <td className="px-2 py-1">{o.closeRate}%</td>
                    <td className="px-2 py-1">{o.avgCloseTimeHours}</td>
                  </tr>
                ))}
                {(!data.officerPerformance || data.officerPerformance.length===0) && <tr><td colSpan={5} className="px-2 py-4 text-center text-gray-500 text-[11px]">No officer data</td></tr>}
              </tbody>
            </table>
          </div>
          {officerTotalPages > 1 && (
            <Pagination page={safeOfficerPage} totalPages={officerTotalPages} onPrev={()=> setOfficerPage(p=> Math.max(1,p-1))} onNext={()=> setOfficerPage(p=> Math.min(officerTotalPages,p+1))} />
          )}
        </Card>
      </div>

  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <Card title="Top Reporters">
          <div className="overflow-auto max-h-64">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
                  <th className="px-2 py-1">User</th>
                  <th className="px-2 py-1">Reports</th>
                </tr>
              </thead>
              <tbody>
                {userItems.map(u => (
                  <tr key={u.userId} className="border-b last:border-none border-gray-100">
                    <td className="px-2 py-1 font-medium text-gray-800">{u.user}</td>
                    <td className="px-2 py-1">{u.reports}</td>
                  </tr>
                ))}
                {(!data.userActivity || data.userActivity.length===0) && <tr><td colSpan={2} className="px-2 py-4 text-center text-gray-500 text-[11px]">No reporter data</td></tr>}
              </tbody>
            </table>
          </div>
          {userTotalPages > 1 && (
            <Pagination page={safeUserPage} totalPages={userTotalPages} onPrev={()=> setUserPage(p=> Math.max(1,p-1))} onNext={()=> setUserPage(p=> Math.min(userTotalPages,p+1))} />
          )}
        </Card>
        <Card title="AI Narrative Insights">
          {data.narrativeInsights?.length ? (
            <ul className="list-disc pl-5 text-xs space-y-1">
              {data.narrativeInsights.map((n,i)=>(<li key={i}>{n}</li>))}
            </ul>
          ) : (
            <p className="text-xs text-gray-500 flex items-center gap-1"><AlertTriangle size={12}/>No AI insights available.</p>
          )}
          {data.trendSummary && <p className="text-[11px] mt-2 text-indigo-700 font-medium">{data.trendSummary}</p>}
          {data.riskSignals?.length>0 && (
            <div className="mt-2">
              <h4 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Risk Signals</h4>
              <ul className="list-disc pl-5 text-[11px] space-y-1">
                {data.riskSignals.map((r,i)=><li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        <Card title="Category Trends (Top)" className="xl:col-span-2">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={categoryTrendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                <XAxis dataKey="period" tick={{ fontSize:10 }} interval={Math.max(0, Math.floor(categoryTrendData.length/14))} />
                <YAxis tick={{ fontSize:10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize:'11px' }} />
                {categoryNames.map((name,i)=> <Line key={name} type="monotone" dataKey={name} stroke={STATUS_COLORS[i % STATUS_COLORS.length]} strokeWidth={2} dot={false} />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Backlog Aging">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={backlogAging} dataKey="value" nameKey="bucket" innerRadius={45} outerRadius={90} paddingAngle={3}>
                  {backlogAging.map((entry,index)=> <Cell key={entry.bucket} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize:'11px' }} />
              </PieChart>
            </ResponsiveContainer>
            {backlogAging.length===0 && <p className="text-[11px] text-gray-500 mt-2">No open backlog</p>}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        <Card title="Closure Efficiency">
          <ul className="text-[11px] space-y-1">
            <li><span className="font-medium">Closed Count:</span> {closureStats.count}</li>
            <li><span className="font-medium">Average Hours:</span> {closureStats.avgHours}</li>
            <li><span className="font-medium">Median Hours:</span> {closureStats.medianHours}</li>
            <li><span className="font-medium">P90 Hours:</span> {closureStats.p90Hours}</li>
          </ul>
        </Card>
        <Card title="Top Departments" className="md:col-span-2">
          <div className="overflow-auto max-h-64">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
                  <th className="px-2 py-1">Department</th>
                  <th className="px-2 py-1">Reports</th>
                </tr>
              </thead>
              <tbody>
                {(data.departmentLoad || []).slice(0,20).map(d=> (
                  <tr key={d.department} className="border-b last:border-none border-gray-100">
                    <td className="px-2 py-1 font-medium text-gray-800">{d.department}</td>
                    <td className="px-2 py-1">{d.count}</td>
                  </tr>
                ))}
                {(!data.departmentLoad || data.departmentLoad.length===0) && <tr><td colSpan={2} className="px-2 py-4 text-center text-gray-500 text-[11px]">No department data</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Raw Data" className={showRaw? '' : 'opacity-40 pointer-events-none select-none'}>
          {showRaw ? (
            <pre className="text-[10px] whitespace-pre-wrap max-h-64 overflow-auto bg-black/5 p-2 rounded">{JSON.stringify(data,null,2)}</pre>
          ) : <p className="text-[11px] text-gray-500">Enable Raw JSON to inspect payload.</p>}
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children, className='' }){
  return (
    <div className={`rounded-xl border border-default bg-surface-trans p-2 sm:p-3 shadow-sm flex flex-col gap-3 ${className}`}>
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-default bg-surface-trans p-4 shadow-sm flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide text-soft font-medium">{label}</span>
      <span className="text-xl font-semibold tracking-tight">{value}</span>
    </div>
  );
}

function Pagination({ page, totalPages, onPrev, onNext }) {
  return (
    <div className="flex items-center justify-end gap-2 mt-3 text-[11px]">
      <button onClick={onPrev} disabled={page<=1} className="h-7 px-2 rounded-md border border-gray-300 bg-white disabled:opacity-40">Prev</button>
      <span className="text-gray-600">Page {page} / {totalPages}</span>
      <button onClick={onNext} disabled={page>=totalPages} className="h-7 px-2 rounded-md border border-gray-300 bg-white disabled:opacity-40">Next</button>
    </div>
  );
}
