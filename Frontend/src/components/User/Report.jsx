import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';

// Utility helpers for localStorage persistence
const STORAGE_KEY = 'reports';
const loadReports = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
};
const saveReports = (reports) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(reports)); } catch {}
};

const Report = () => {
  const { isLoaded, user } = useUser();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    category: '',
    location: '',
    description: '',
    image: null,
  });

  useEffect(()=>{ if(success){ const t=setTimeout(()=>setSuccess(false),3000); return ()=>clearTimeout(t);} },[success]);

  if (!isLoaded) return <div className="text-sm text-gray-500">Loading...</div>;
  if (!user) return <div className="text-sm text-gray-500">Please sign in to submit a report.</div>;

  const onChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'image' && files?.[0]) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = () => setForm(f => ({ ...f, image: reader.result }));
      reader.readAsDataURL(file);
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if(!form.title || !form.category || !form.description){
      setError('Please fill in required fields.');
      return;
    }
    setSubmitting(true);
    const all = loadReports();
    const report = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'Pending',
      userId: user.id,
      userEmail: user.primaryEmailAddress?.emailAddress || null,
      ...form,
    };
    all.push(report);
    saveReports(all);
    setSubmitting(false);
    setSuccess(true);
    setForm({ title:'', category:'', location:'', description:'', image:null });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Submit a Report</h1>
        <p className="text-sm text-gray-600">Provide detailed information so authorities can act faster.</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-6 bg-white/70 backdrop-blur rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Title<span className="text-rose-500">*</span></label>
            <input name="title" value={form.title} onChange={onChange} required className="w-full h-11 px-3 rounded-lg border border-gray-300 bg-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 text-sm" placeholder="Short summary" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Category<span className="text-rose-500">*</span></label>
            <select name="category" value={form.category} onChange={onChange} required className="w-full h-11 px-3 rounded-lg border border-gray-300 bg-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 text-sm">
              <option value="" disabled>Select category</option>
              <option>Pothole</option>
              <option>Garbage</option>
              <option>Water Supply</option>
              <option>Street Light</option>
              <option>Other</option>
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Location</label>
            <input name="location" value={form.location} onChange={onChange} className="w-full h-11 px-3 rounded-lg border border-gray-300 bg-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 text-sm" placeholder="Address or landmark" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Description<span className="text-rose-500">*</span></label>
            <textarea name="description" value={form.description} onChange={onChange} required rows={5} className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 text-sm resize-none" placeholder="Describe the issue, impact, urgency..." />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Photo (optional)</label>
            <input type="file" name="image" accept="image/*" onChange={onChange} className="block w-full text-sm text-gray-600" />
            {form.image && <img src={form.image} alt="Preview" className="mt-2 h-40 w-auto rounded-lg object-cover border border-gray-200" />}
          </div>
        </div>
        {error && <div className="text-sm text-rose-600 font-medium">{error}</div>}
        {success && <div className="text-sm text-emerald-600 font-medium">Report submitted successfully!</div>}
        <div className="flex items-center gap-4">
          <button disabled={submitting} type="submit" className="inline-flex items-center justify-center px-5 h-11 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition active:scale-95">
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
          <p className="text-xs text-gray-500">Fields marked * are required.</p>
        </div>
      </form>
    </div>
  );
};

export default Report;