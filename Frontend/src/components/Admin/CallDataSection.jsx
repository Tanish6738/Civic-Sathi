import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Area, AreaChart } from 'recharts';

// Simple stat card reused inside sections
const StatCard = ({ label, value, diff, diffLabel }) => {
  const diffColor = diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-500';
  const sign = diff > 0 ? '+' : '';
  return (
    <div className="rounded-xl border border-gray-200 bg-white/70 backdrop-blur p-4 shadow-sm flex flex-col gap-1">
      <span className="text-sm text-gray-500 font-medium">{label}</span>
      <span className="text-2xl font-semibold tracking-tight">{value}</span>
      {diff !== undefined && (
        <span className={`text-xs font-medium ${diffColor}`}>{sign}{diff}% {diffLabel}</span>
      )}
    </div>
  );
};

const CallDataSection = () => {
  // Fake data generation (could be replaced with real API data)
  const data = useMemo(() => [
    { day: 'Mon', calls: 120, resolved: 90 },
    { day: 'Tue', calls: 98, resolved: 75 },
    { day: 'Wed', calls: 135, resolved: 110 },
    { day: 'Thu', calls: 150, resolved: 130 },
    { day: 'Fri', calls: 180, resolved: 160 },
    { day: 'Sat', calls: 90, resolved: 70 },
    { day: 'Sun', calls: 60, resolved: 50 }
  ], []);

  const totals = useMemo(() => {
    const totalCalls = data.reduce((a, b) => a + b.calls, 0);
    const totalResolved = data.reduce((a, b) => a + b.resolved, 0);
    const resolutionRate = Math.round((totalResolved / totalCalls) * 100);
    return { totalCalls, totalResolved, resolutionRate };
  }, [data]);

  return (
    <section className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Call Center Activity</h2>
        <span className="text-xs text-gray-500">Last 7 days</span>
      </header>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Calls" value={totals.totalCalls} diff={8} diffLabel="vs prev." />
        <StatCard label="Resolved" value={totals.totalResolved} diff={5} diffLabel="vs prev." />
        <StatCard label="Resolution Rate" value={totals.resolutionRate + '%'} diff={2} diffLabel="pts" />
      </div>

      <div className="h-72 w-full rounded-xl border border-gray-200 bg-white/70 backdrop-blur p-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="callsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="resolvedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#6b7280" />
            <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
            <Tooltip contentStyle={{ fontSize: '12px' }} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Area type="monotone" dataKey="calls" stroke="#6366F1" fillOpacity={1} fill="url(#callsGradient)" />
            <Area type="monotone" dataKey="resolved" stroke="#10B981" fillOpacity={1} fill="url(#resolvedGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

export default CallDataSection;
