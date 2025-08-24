import React from 'react';
import ProgressiveForm from './Froms';
import { createReport } from '../../services/report.services';
import { getCategories } from '../../services/category.services';
import { useUser } from '@clerk/clerk-react';
import { useToast } from '../../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { useColorMode } from '../../hooks/useColorMode';
import { RefreshCcw, Sparkles, Moon, Sun } from 'lucide-react';

// Page wrapper for ProgressiveForm so it fits existing layout routing
const CategoryFormPage = () => {
  const { user } = useUser();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [categories, setCategories] = React.useState([]);
  const [loadingCats, setLoadingCats] = React.useState(false);
  const [catError, setCatError] = React.useState('');
  const { mode, toggle } = useColorMode();

  React.useEffect(()=>{
    let cancelled = false;
    async function load(){
      setLoadingCats(true); setCatError('');
      try { const list = await getCategories(); if(!cancelled) setCategories(list); }
      catch(e){ if(!cancelled) setCatError(e?.response?.data?.message || 'Failed to load categories'); }
      finally { if(!cancelled) setLoadingCats(false); }
    }
    load();
    return ()=>{ cancelled = true; };
  },[]);

  const mappedData = React.useMemo(()=>{
    if (!categories?.length) return [];
    // ProgressiveForm expects { id, label, subcategories: [{ label, href }] }
    return categories.map(c => ({ id: c._id, label: c.name, subcategories: (c.keywords||[]).slice(0,6).map(k=>({ label: k, href: null })) }));
  },[categories]);

  const handleSubmit = async (sel) => {
    try {
      await createReport({
        title: `${sel.subcategoryLabel || sel.categoryLabel} Request`,
        description: `Service request for ${sel.subcategoryLabel || sel.categoryLabel}. Location source: ${sel.location.source}.`,
        reporterId: user?.publicMetadata?.mongoId || user?.id,
        department: undefined,
        categoryId: undefined,
        photosBefore: []
      });
      notify('Report created', 'success');
      navigate('/user/reports');
    } catch (e) {
      notify(e?.response?.data?.message || 'Failed to create report', 'error');
    }
  };

  const showSkeleton = loadingCats && categories.length === 0;

  return (
    <div className="max-w-5xl mx-auto space-y-10 px-3 sm:px-6 py-8">
      {/* Hero / Intro */}
      <section className="relative overflow-hidden rounded-3xl border border-[rgb(var(--ds-border))] bg-gradient-to-br from-[rgb(var(--ds-primary))] via-[rgb(var(--ds-secondary))] to-[rgb(var(--ds-primary))] text-white px-8 py-10 shadow-elevate">
        <div className="absolute inset-0 opacity-[0.18] bg-[radial-gradient(circle_at_30%_25%,white,transparent_65%)]" />
        <div className="relative flex flex-col md:flex-row md:items-end gap-8">
          <div className="space-y-3 flex-1 min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight drop-shadow-sm">Citizen Services</h1>
            <p className="text-sm text-white/85 max-w-xl leading-relaxed">Browse service categories and quickly submit a structured report with location details so departments can act faster.</p>
            <div className="flex flex-wrap items-center gap-4 text-[11px] font-semibold uppercase tracking-wide text-white/70">
              <span className="inline-flex items-center gap-2"><Sparkles size={14}/> Smart Guided Steps</span>
              <span className="h-3 w-px bg-white/30" />
              <span className="inline-flex items-center gap-2"><RefreshCcw size={14}/> Live Categories</span>
            </div>
          </div>
          <div className="flex items-center gap-3 md:self-start">
            <button
              type="button"
              onClick={toggle}
              aria-label="Toggle color mode"
              className="h-11 px-4 rounded-xl bg-white/15 hover:bg-white/25 text-[12px] font-semibold backdrop-blur flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-white/60"
            >
              {mode === 'dark' ? <Sun size={16}/> : <Moon size={16}/>}
              {mode === 'dark' ? 'Light' : 'Dark'}
            </button>
            <button
              type="button"
              disabled={loadingCats}
              onClick={()=>{ if(!loadingCats){
                setCategories([]); // optional reset for better skeleton effect
                setLoadingCats(true);
                getCategories().then(list=>setCategories(list)).catch(e=>setCatError(e?.response?.data?.message||'Failed to load categories')).finally(()=>setLoadingCats(false));
              }}}
              className="h-11 px-5 rounded-xl bg-white/15 hover:bg-white/25 text-[12px] font-semibold backdrop-blur flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-white/60 disabled:opacity-50"
            >
              <RefreshCcw size={16} className={loadingCats? 'animate-spin':''}/> {loadingCats? 'Loading':'Refresh'}
            </button>
          </div>
        </div>
      </section>

      {/* Form Card */}
      <div className="relative rounded-2xl border border-[rgb(var(--ds-border))] bg-[rgb(var(--ds-surface))]/85 backdrop-blur shadow-sm p-6 md:p-8 space-y-6">
        {catError && (
          <div className="text-sm flex items-start gap-2 bg-[rgba(var(--ds-error),0.12)] text-[rgb(var(--ds-error))] border border-[rgba(var(--ds-error),0.4)] rounded-xl px-4 py-3">
            {catError}
          </div>
        )}
        {showSkeleton && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
            {Array.from({length:6}).map((_,i)=>(
              <div key={i} className="h-32 rounded-2xl border border-[rgba(var(--ds-border),0.7)] bg-[rgba(var(--ds-muted),0.6)] relative overflow-hidden animate-pulse" />
            ))}
          </div>
        )}
        <ProgressiveForm
          data={mappedData}
          onSubmit={handleSubmit}
          onCancel={() => { if (window.history.length > 1) window.history.back(); else navigate('/'); }}
        />
        {loadingCats && categories.length > 0 && (
          <div className="mt-2 text-[11px] text-soft flex items-center gap-2"><RefreshCcw size={12} className="animate-spin"/> Updating categories...</div>
        )}
      </div>
    </div>
  );
};

export default CategoryFormPage;
