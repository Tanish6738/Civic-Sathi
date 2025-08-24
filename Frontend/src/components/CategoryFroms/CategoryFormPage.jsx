import React from 'react';
import ProgressiveForm from './Froms';
import { createReport } from '../../services/report.services';
import { getCategories } from '../../services/category.services';
import { useUser } from '@clerk/clerk-react';
import { useToast } from '../../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';

// Page wrapper for ProgressiveForm so it fits existing layout routing
const CategoryFormPage = () => {
  const { user } = useUser();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [categories, setCategories] = React.useState([]);
  const [loadingCats, setLoadingCats] = React.useState(false);
  const [catError, setCatError] = React.useState('');

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

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-800">Citizen Services</h1>
        <p className="text-sm text-gray-600 mt-1">Browse categories and create a report.</p>
      </div>
      <div className="bg-white/80 backdrop-blur rounded-xl border border-gray-200 shadow-sm p-6">
        {catError && <div className="mb-4 text-sm text-rose-600">{catError}</div>}
        <ProgressiveForm
          data={mappedData}
          onSubmit={handleSubmit}
          onCancel={() => { if (window.history.length > 1) window.history.back(); else navigate('/'); }}
        />
        {loadingCats && <div className="mt-4 text-xs text-gray-500">Loading categories...</div>}
      </div>
    </div>
  );
};

export default CategoryFormPage;
