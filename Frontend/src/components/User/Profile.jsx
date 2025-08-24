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
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Header / Identity */}
      <section className="relative overflow-hidden rounded-3xl shadow-elevate border border-[rgb(var(--ds-border))] bg-gradient-to-br from-[rgb(var(--ds-primary))] via-[rgb(var(--ds-secondary))] to-[rgb(var(--ds-primary))] text-white">
        {/* Decorative layers */}
        <div className="absolute inset-0 opacity-[0.13] mix-blend-screen bg-[radial-gradient(circle_at_25%_30%,white,transparent_60%)]" />
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-8 p-8">
          <div className="relative">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={displayName}
                className="h-32 w-32 rounded-2xl object-cover ring-4 ring-white/25 shadow-2xl"
                loading="lazy"
              />
            ) : (
              <div className="h-32 w-32 rounded-2xl bg-white/15 flex items-center justify-center ring-4 ring-white/15 shadow-inner backdrop-blur-sm">
                <UserCircle size={70} className="text-white/70" />
              </div>
            )}
            <span className="absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-[10px] font-semibold tracking-wide bg-white/20 backdrop-blur-md ring-1 ring-white/30">User</span>
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <h1 className="text-3xl md:text-4xl font-semibold leading-tight tracking-tight drop-shadow-sm truncate">
              {displayName}
            </h1>
            {email && (
              <p className="flex items-center gap-2 text-sm text-white/90 font-medium">
                <Mail size={16} /> {email}
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <StatusPill icon={ShieldCheck} active={twoFactorEnabled} label={twoFactorEnabled ? '2FA Enabled' : '2FA Disabled'} />
              <StatusPill icon={LockKeyhole} active={passwordEnabled} label={passwordEnabled ? 'Password Set' : 'Password Not Set'} />
            </div>
          </div>
        </div>
      </section>

      {/* Key Stats / Meta */}
      <section>
        <h2 className="sr-only">Account Meta Information</h2>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
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
      </section>

      {/* Editable Profile */}
      <section className="space-y-5">
        <header className="flex items-center gap-2">
          <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-[rgba(var(--ds-primary),0.15)] text-[rgb(var(--ds-primary))] ring-1 ring-[rgba(var(--ds-primary),0.25)]">
            <UserCircle size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Profile Details</h2>
            <p className="text-[11px] text-soft font-medium">Update your public profile information.</p>
          </div>
        </header>
        <form
          onSubmit={onSubmit}
          className="grid gap-6 md:grid-cols-3 rounded-2xl border border-[rgb(var(--ds-border))] bg-[rgb(var(--ds-surface))]/80 backdrop-blur-xl p-6 shadow-elevate"
        >
          <div className="space-y-2">
            <label className="text-[11px] font-semibold tracking-wide uppercase text-soft flex items-center gap-1">Name<span className="text-[rgb(var(--ds-error))]">*</span></label>
            <input
              name="name"
              value={form.name}
              onChange={onChange}
              required
              disabled={saving}
              className="h-12 w-full rounded-xl border border-[rgb(var(--ds-border))] bg-[rgb(var(--ds-surface))] px-3 text-sm font-medium shadow-sm focus:outline-none focus:ring-4 focus:ring-[rgba(var(--ds-ring),0.35)] focus:border-[rgb(var(--ds-primary))]"
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-semibold tracking-wide uppercase text-soft flex items-center gap-1"><Phone size={12} /> Phone</label>
            <input
              name="phone"
              value={form.phone}
              onChange={onChange}
              disabled={saving}
              className="h-12 w-full rounded-xl border border-[rgb(var(--ds-border))] bg-[rgb(var(--ds-surface))] px-3 text-sm font-medium shadow-sm focus:outline-none focus:ring-4 focus:ring-[rgba(var(--ds-ring),0.35)] focus:border-[rgb(var(--ds-primary))]"
              placeholder="Phone"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-semibold tracking-wide uppercase text-soft flex items-center gap-1"><Building2 size={12} /> Department</label>
            <input
              value={dbUser?.department || ''}
              disabled
              className="h-12 w-full rounded-xl border border-[rgb(var(--ds-border))] bg-[rgba(var(--ds-muted),0.65)] px-3 text-sm font-medium text-soft"
              placeholder="Not Assigned"
            />
          </div>
          <div className="md:col-span-3 flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-1">
            <button
              type="submit"
              disabled={saving || loadingDb || !dbUser?._id}
              className="relative inline-flex items-center gap-2 bg-gradient-to-r from-[rgb(var(--ds-primary))] via-[rgb(var(--ds-secondary))] to-[rgb(var(--ds-primary))] text-white h-12 px-6 rounded-xl text-sm font-semibold shadow-md hover:brightness-105 disabled:opacity-55 disabled:cursor-not-allowed active:scale-[.97] focus:outline-none focus:ring-4 focus:ring-[rgba(var(--ds-ring),0.4)] transition"
            >
              {saving && <span className="absolute left-4 inline-block h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              <Save size={16} /> <span>{saving ? 'Saving…' : 'Save Changes'}</span>
            </button>
            {loadingDb && <span className="text-[11px] font-medium text-soft">Loading profile…</span>}
            {message && (
              <span
                className={`text-[11px] font-semibold px-3 py-1 rounded-md ring-1 ${
                  message.type === 'error'
                    ? 'bg-[rgba(var(--ds-error),0.10)] text-[rgb(var(--ds-error))] ring-[rgba(var(--ds-error),0.35)]'
                    : 'bg-[rgba(var(--ds-success),0.12)] text-[rgb(var(--ds-success))] ring-[rgba(var(--ds-success),0.35)]'
                }`}
              >
                {message.text}
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Recent Reports */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-[rgba(var(--ds-primary),0.15)] text-[rgb(var(--ds-primary))] ring-1 ring-[rgba(var(--ds-primary),0.25)]">
              <FileText size={18} />
            </div>
            <h2 className="text-lg font-semibold tracking-tight">Recent Reports</h2>
          </div>
          <Link
            to="/user/reports"
            className="inline-flex items-center gap-1 text-xs font-semibold tracking-wide uppercase rounded-md px-3 py-1.5 bg-[rgba(var(--ds-primary),0.10)] text-[rgb(var(--ds-primary))] ring-1 ring-[rgba(var(--ds-primary),0.25)] hover:bg-[rgba(var(--ds-primary),0.18)] transition"
          >
            View All <ArrowRight size={14} />
          </Link>
        </div>
        {reportsLoading && (
          <div className="text-sm text-soft bg-[rgb(var(--ds-surface))]/80 backdrop-blur p-6 rounded-2xl border border-[rgb(var(--ds-border))] shadow-elevate">Loading reports…</div>
        )}
        {!reportsLoading && reportsError && (
          <div className="text-sm bg-[rgba(var(--ds-error),0.08)] text-[rgb(var(--ds-error))] backdrop-blur p-6 rounded-2xl border border-[rgba(var(--ds-error),0.4)] shadow-sm">{reportsError}</div>
        )}
        {!reportsLoading && !reportsError && myReports.length === 0 ? (
          <div className="text-sm text-soft bg-[rgb(var(--ds-surface))]/80 backdrop-blur p-6 rounded-2xl border border-[rgb(var(--ds-border))] shadow-sm">No reports submitted yet.</div>
        ) : !reportsLoading && !reportsError && (
          <ul className="space-y-4">
            {myReports.map(r => (
              <li
                key={r._id || r.id}
                className="group relative overflow-hidden rounded-xl border border-[rgb(var(--ds-border))] bg-[rgb(var(--ds-surface))]/85 backdrop-blur-sm p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br from-[rgba(var(--ds-primary),0.08)] to-transparent transition" />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <p className="font-semibold text-[rgb(var(--ds-text))] truncate" title={r.title}>{r.title}</p>
                    <p className="text-[11px] text-soft flex items-center gap-1 font-medium"><CalendarClock size={12} /> {r.createdAt ? new Date(r.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</p>
                  </div>
                  <span className={`relative z-10 text-[10px] font-semibold tracking-wide px-2 py-1 rounded-md ring-1 ${statusClasses[r.status] || 'bg-gray-100 text-gray-600 ring-gray-300'}`}>{r.status}</span>
                </div>
                <p className="relative text-[13px] leading-relaxed text-soft line-clamp-2">{r.description}</p>
                <div className="relative flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wide">
                  <span className="px-2 py-1 rounded-md bg-[rgba(var(--ds-primary),0.12)] text-[rgb(var(--ds-primary))] ring-1 ring-[rgba(var(--ds-primary),0.35)]">{typeof r.category === 'object' ? r.category?.name : r.category}</span>
                  {r.location && <span className="px-2 py-1 rounded-md bg-[rgba(var(--ds-muted),0.8)] text-soft ring-1 ring-[rgba(var(--ds-border),0.6)]">{r.location}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

// Reusable components
const StatusPill = ({ icon: Icon, label, active }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide ring-1 transition backdrop-blur-md ${
      active
        ? 'bg-white/20 text-white ring-white/30'
        : 'bg-white/10 text-white/70 ring-white/20'
    }`}
  >
    <Icon size={13} /> {label}
  </span>
);

const InfoCard = ({ icon: Icon, label, value, actionIcon: ActionIcon, onAction, actionLabel, badge, badgeTone = 'ok' }) => (
  <div className="group relative overflow-hidden rounded-2xl border border-[rgb(var(--ds-border))] bg-[rgb(var(--ds-surface))]/80 backdrop-blur-sm shadow-sm hover:shadow-md transition">
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br from-[rgba(var(--ds-primary),0.08)] to-transparent pointer-events-none transition" />
    <div className="relative p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-[rgba(var(--ds-primary),0.12)] text-[rgb(var(--ds-primary))] flex items-center justify-center ring-1 ring-[rgba(var(--ds-primary),0.3)]">
            <Icon size={20} />
          </div>
          <span className="text-[11px] font-semibold tracking-wide text-soft uppercase">{label}</span>
        </div>
        {badge && (
          <span
            className={`text-[10px] font-semibold tracking-wide px-2 py-1 rounded-md ring-1 ${
              badgeTone === 'warn'
                ? 'bg-amber-100 text-amber-700 ring-amber-300'
                : 'bg-emerald-100 text-emerald-700 ring-emerald-300'
            }`}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 min-h-6">
        <p className="text-base font-semibold text-[rgb(var(--ds-text))] truncate" title={typeof value === 'string' ? value : undefined}>{value}</p>
        {ActionIcon && onAction && (
          <button
            onClick={onAction}
            aria-label={actionLabel || 'Action'}
            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-soft hover:text-[rgb(var(--ds-primary))] hover:bg-[rgba(var(--ds-primary),0.12)] active:scale-95 transition"
          >
            <ActionIcon size={16} />
          </button>
        )}
      </div>
    </div>
  </div>
);

export default Profile;