import React, { useEffect, useState, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Mail, ShieldCheck, LockKeyhole, KeyRound, CalendarClock, Hash, Copy, UserCircle, FileText, ArrowRight, Phone, Building2, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getUserById, updateUser } from '../../services/user.services';
import { getReports } from '../../services/report.services';
import { useToast } from '../../contexts/ToastContext';
import { useDbUser } from '../../contexts/UserContext';

// Remote reports are fetched via API; fallback local storage removed.

const Profile = () => {
  const { isLoaded, user } = useUser();
  const { dbUser, setDbUser } = useDbUser();
  const { notify } = useToast();
  const [loadingDb, setLoadingDb] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' }); // department is read-only now
  const [message, setMessage] = useState(null);

  // Fetch the user document if we have clerk user but no dbUser loaded yet
  useEffect(() => {
    let cancelled = false;
    async function fetchDb() {
      if (!user?.id || dbUser?._id) return; // already have
      setLoadingDb(true);
      try {
        const res = await getUserById(user.id).catch(()=>null);
        if (!cancelled && res) setDbUser(res);
      } finally {
        if (!cancelled) setLoadingDb(false);
      }
    }
    fetchDb();
    return () => { cancelled = true; };
  }, [user, dbUser, setDbUser]);

  // Initialize form when dbUser changes
  useEffect(() => {
    if (dbUser) {
      setForm({ name: dbUser.name || '', phone: dbUser.phone || '' });
    }
  }, [dbUser]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!dbUser?._id) return;
    setSaving(true); setMessage(null);
    try {
  // Only send editable fields (name, phone). Department changes are reserved for admins.
  const updated = await updateUser(dbUser._id, { name: form.name, phone: form.phone });
      setDbUser(updated);
  notify('Profile updated', 'success');
      setMessage({ type: 'success', text: 'Profile updated.' });
    } catch (err) {
  const msg = err?.response?.data?.message || 'Update failed';
  notify(msg, 'error');
      setMessage({ type: 'error', text: msg });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  if (!isLoaded) {
    return (
      <div className="animate-pulse space-y-6 max-w-3xl">
        <div className="h-40 rounded-xl bg-gray-200/70" />
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-200/60 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) return <div className="text-sm text-gray-500">No user data available.</div>;

  const {
    firstName,
    lastName,
    fullName,
    imageUrl,
    primaryEmailAddress,
    lastSignInAt,
    id,
    twoFactorEnabled,
    passwordEnabled,
  } = user;

  const email = primaryEmailAddress?.emailAddress;
  const displayName = fullName || [firstName, lastName].filter(Boolean).join(' ') || 'User';
  const lastSignIn = lastSignInAt ? new Date(lastSignInAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  const shortId = id ? id.replace(/^user_/, '').slice(0, 10) + '…' : '—';

  const copyId = () => {
    if (!id) return;
    navigator.clipboard.writeText(id).catch(() => {});
  };

  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState('');

  // Fetch user's recent reports from backend
  useEffect(()=>{
    let cancelled = false;
    async function loadReports(){
      if(!dbUser?._id) return; // wait for db user
      setReportsLoading(true); setReportsError('');
      try {
        const res = await getReports({ reporter: dbUser._id, limit: 5 });
        const items = res.items || res || [];
        if(!cancelled) setReports(items);
      } catch(e){ if(!cancelled) setReportsError(e?.response?.data?.message || 'Failed to load reports'); }
      finally { if(!cancelled) setReportsLoading(false); }
    }
    loadReports();
    return () => { cancelled = true; };
  }, [dbUser]);

  const myReports = useMemo(()=> (reports || []).slice(0,5),[reports]);

  // Department list not needed; department is assigned by admin and read-only here.

  const statusClasses = {
    Pending: 'bg-amber-100 text-amber-700 ring-amber-300',
    Resolved: 'bg-emerald-100 text-emerald-700 ring-emerald-300',
    Rejected: 'bg-rose-100 text-rose-700 ring-rose-300'
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
  {/* Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-indigo-700 text-white shadow-lg ring-1 ring-indigo-400/40">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_30%,white,transparent_60%)]" />
        <div className="flex flex-col md:flex-row md:items-center gap-6 p-6 md:p-8 relative">
          <div className="relative">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={displayName}
                className="h-28 w-28 rounded-2xl object-cover ring-4 ring-white/20 shadow-xl"
                loading="lazy"
              />
            ) : (
              <div className="h-28 w-28 rounded-2xl bg-indigo-800/60 flex items-center justify-center ring-4 ring-white/10">
                <UserCircle size={56} className="text-white/70" />
              </div>
            )}
          </div>
          <div className="space-y-2 flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight truncate">{displayName}</h1>
            {email && <p className="flex items-center gap-2 text-indigo-100/90 text-sm"><Mail size={16} /> {email}</p>}
            <div className="flex flex-wrap gap-2 pt-2">
              <StatusPill icon={twoFactorEnabled ? ShieldCheck : ShieldCheck} active={twoFactorEnabled} label={twoFactorEnabled ? '2FA Enabled' : '2FA Disabled'} />
              <StatusPill icon={LockKeyhole} active={passwordEnabled} label={passwordEnabled ? 'Password Set' : 'Password Not Set'} />
            </div>
          </div>
        </div>
      </div>

  {/* Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <InfoCard
          icon={Hash}
          label="User ID"
          value={shortId}
          actionIcon={Copy}
          onAction={copyId}
          actionLabel="Copy full ID"
        />
        <InfoCard icon={CalendarClock} label="Last Sign-In" value={lastSignIn} />
        <InfoCard
          icon={KeyRound}
          label="Authentication"
          value={twoFactorEnabled ? 'Strong (2FA)' : 'Standard'}
          badge={twoFactorEnabled ? 'Secure' : undefined}
        />
        <InfoCard
            icon={LockKeyhole}
            label="Password"
            value={passwordEnabled ? 'Configured' : 'Not Set'}
            badge={!passwordEnabled ? 'Action Recommended' : undefined}
            badgeTone={passwordEnabled ? 'ok' : 'warn'}
        />
      </div>

      {/* Editable Profile (DB) */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2"><UserCircle size={18}/> Profile Details</h2>
        <form onSubmit={onSubmit} className="grid gap-5 md:grid-cols-3 bg-white/70 backdrop-blur p-6 rounded-xl border border-gray-200">
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600 flex items-center gap-1">Name<span className="text-rose-500">*</span></label>
            <input name="name" value={form.name} onChange={onChange} required disabled={saving} className="h-11 w-full rounded-lg border border-gray-300 bg-white/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60" placeholder="Your name" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600 flex items-center gap-1"><Phone size={12}/> Phone</label>
            <input name="phone" value={form.phone} onChange={onChange} disabled={saving} className="h-11 w-full rounded-lg border border-gray-300 bg-white/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60" placeholder="Phone" />
          </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 flex items-center gap-1"><Building2 size={12}/> Department (Assigned)</label>
              <input value={dbUser?.department || ''} disabled className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700" placeholder="Not Assigned" />
            </div>
            <div className="md:col-span-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
              <button type="submit" disabled={saving || loadingDb || !dbUser?._id} className="inline-flex items-center gap-2 bg-indigo-600 text-white h-11 px-5 rounded-lg text-sm font-medium shadow hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 transition">
                {saving && <span className="inline-block h-4 w-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />}
                <Save size={16}/> <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
              {loadingDb && <span className="text-xs text-gray-500">Loading profile...</span>}
              {message && <span className={`text-xs font-medium ${message.type==='error' ? 'text-rose-600' : 'text-emerald-600'}`}>{message.text}</span>}
            </div>
        </form>
      </div>

    {/* Recent Reports Summary */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2"><FileText size={18}/> Recent Reports</h2>
      <Link to="/user/reports" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500">View All <ArrowRight size={14} /></Link>
        </div>
        {reportsLoading && (
          <div className="text-sm text-gray-500 bg-white/70 backdrop-blur p-6 rounded-xl border border-gray-200">Loading reports...</div>
        )}
        {!reportsLoading && reportsError && (
          <div className="text-sm text-rose-600 bg-white/70 backdrop-blur p-6 rounded-xl border border-gray-200">{reportsError}</div>
        )}
        {!reportsLoading && !reportsError && myReports.length === 0 ? (
          <div className="text-sm text-gray-500 bg-white/70 backdrop-blur p-6 rounded-xl border border-gray-200">No reports submitted yet.</div>
        ) : !reportsLoading && !reportsError && (
          <ul className="space-y-3">
            {myReports.map(r => (
              <li key={r._id || r.id} className="group rounded-lg border border-gray-200 bg-white/70 backdrop-blur-sm p-4 flex flex-col gap-2 hover:shadow-sm transition relative overflow-hidden">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate" title={r.title}>{r.title}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1"><CalendarClock size={12}/> {r.createdAt ? new Date(r.createdAt).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}) : '—'}</p>
                  </div>
                  <span className={`text-[10px] font-semibold tracking-wide px-2 py-1 rounded-md ring-1 ${statusClasses[r.status] || 'bg-gray-100 text-gray-600 ring-gray-300'}`}>{r.status}</span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{r.description}</p>
                <div className="flex flex-wrap gap-2 text-[10px] font-medium uppercase tracking-wide">
                  <span className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">{typeof r.category === 'object' ? r.category?.name : r.category}</span>
                  {r.location && <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-700 ring-1 ring-gray-300">{r.location}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// Reusable components
const StatusPill = ({ icon: Icon, label, active }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 backdrop-blur transition ${
    active
      ? 'bg-white/15 text-white ring-white/25'
      : 'bg-white/5 text-indigo-100/70 ring-white/15'
  }`}>
    <Icon size={14} /> {label}
  </span>
);

const InfoCard = ({ icon: Icon, label, value, actionIcon: ActionIcon, onAction, actionLabel, badge, badgeTone = 'ok' }) => (
  <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white/70 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br from-indigo-50/50 to-transparent pointer-events-none transition-opacity" />
    <div className="p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-600/10 text-indigo-600 flex items-center justify-center ring-1 ring-indigo-600/20">
            <Icon size={18} />
          </div>
          <span className="text-sm font-medium tracking-wide text-gray-600 uppercase">{label}</span>
        </div>
        {badge && (
          <span className={`text-[10px] font-semibold tracking-wide px-2 py-1 rounded-md ring-1 ${
            badgeTone === 'warn'
              ? 'bg-amber-100 text-amber-700 ring-amber-300'
              : 'bg-emerald-100 text-emerald-700 ring-emerald-300'
          }`}>{badge}</span>
        )}
      </div>
      <div className="flex items-center gap-2 min-h-6">
        <p className="text-base font-medium text-gray-900 truncate" title={typeof value === 'string' ? value : undefined}>{value}</p>
        {ActionIcon && onAction && (
          <button
            onClick={onAction}
            aria-label={actionLabel || 'Action'}
            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 active:scale-95 transition"
          >
            <ActionIcon size={16} />
          </button>
        )}
      </div>
    </div>
  </div>
);

export default Profile;