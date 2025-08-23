import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';

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

const COLORS = ['#6366F1', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6'];

const WebComplaintsSection = () => {
  const complaints = useMemo(() => [
    { day: 'Mon', total: 45, open: 20, closed: 25 },
    { day: 'Tue', total: 38, open: 15, closed: 23 },
    { day: 'Wed', total: 50, open: 18, closed: 32 },
    { day: 'Thu', total: 60, open: 25, closed: 35 },
    { day: 'Fri', total: 70, open: 30, closed: 40 },
    { day: 'Sat', total: 25, open: 10, closed: 15 },
    { day: 'Sun', total: 15, open: 6, closed: 9 }
  ], []);

  const categoryBreakdown = useMemo(() => [
    { name: 'UI / UX', value: 120 },
    { name: 'Performance', value: 90 },
    { name: 'Security', value: 30 },
    { name: 'Content', value: 60 },
    { name: 'Other', value: 40 }
  ], []);

  const totals = useMemo(() => {
    const total = complaints.reduce((a, b) => a + b.total, 0);
    const open = complaints.reduce((a, b) => a + b.open, 0);
    const closed = complaints.reduce((a, b) => a + b.closed, 0);
    const closeRate = Math.round((closed / total) * 100);
    return { total, open, closed, closeRate };
  }, [complaints]);

  return (
    <section className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Web Complaints</h2>
        <span className="text-xs text-gray-500">Last 7 days</span>
      </header>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Complaints" value={totals.total} diff={12} diffLabel="vs prev." />
        <StatCard label="Open" value={totals.open} diff={-3} diffLabel="vs prev." />
        <StatCard label="Closed" value={totals.closed} diff={10} diffLabel="vs prev." />
        <StatCard label="Close Rate" value={totals.closeRate + '%'} diff={4} diffLabel="pts" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="h-72 w-full rounded-xl border border-gray-200 bg-white/70 backdrop-blur p-3 lg:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={complaints}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#6b7280" />
              <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
              <Tooltip contentStyle={{ fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="open" stackId="a" fill="#F59E0B" />
              <Bar dataKey="closed" stackId="a" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="h-72 w-full rounded-xl border border-gray-200 bg-white/70 backdrop-blur p-3 flex flex-col items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={categoryBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={4}>
                {categoryBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [value, name]} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
};

export default WebComplaintsSection;
