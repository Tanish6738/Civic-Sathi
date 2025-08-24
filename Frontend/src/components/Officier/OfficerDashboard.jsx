import React, { useEffect, useState } from 'react';
import { getOfficerDashboard } from '../../services/officer.services';
import { useTheme } from '../../contexts/ThemeContext';
import { Activity, ClipboardList, AlertTriangle } from 'lucide-react';

const statClasses = 'flex flex-col items-start justify-between p-4 rounded-lg shadow-sm border border-default bg-surface/80 backdrop-blur-sm gap-2 min-w-[9rem]';

export default function OfficerDashboard() {
  const { theme } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true); setError(null);
      const res = await getOfficerDashboard();
      if (!active) return;
      if (res.error) setError(res.error); else setData(res.data);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  if (loading) return <div className="py-10 text-center text-sm text-soft">Loading dashboard...</div>;
  if (error) return <div className="py-10 text-center text-danger text-sm">{error}</div>;

  const counts = data?.counts || {};

  const items = [
    { key: 'submitted', label: 'Submitted', value: counts.submitted, icon: ClipboardList },
    { key: 'assigned', label: 'Assigned', value: counts.assigned, icon: Activity },
    { key: 'in_progress', label: 'In Progress', value: counts.in_progress, icon: Activity },
    { key: 'awaiting_verification', label: 'Awaiting Verif.', value: counts.awaiting_verification, icon: ClipboardList },
    { key: 'misrouted', label: 'Misrouted', value: counts.misrouted, icon: AlertTriangle },
  ];

  return (
    <div className="flex flex-col gap-6 w-full mx-auto max-w-6xl">
      <h1 className="text-2xl font-semibold tracking-tight">Officer Dashboard</h1>
      <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
        {items.map(it => {
          const Icon = it.icon;
          return (
            <div key={it.key} className={statClasses}>
              <Icon size={18} className="text-primary" />
              <div className="text-2xl font-semibold leading-none">{it.value || 0}</div>
              <div className="text-xs font-medium tracking-wide text-soft/70 uppercase">{it.label}</div>
            </div>
          );
        })}
      </div>
      <div className="rounded-lg p-4 border border-dashed border-default text-xs text-soft/70 bg-surface/60">
        Tip: Progress reports by updating statuses and adding completion photos. Misroute if category/department is wrong.
      </div>
    </div>
  );
}
