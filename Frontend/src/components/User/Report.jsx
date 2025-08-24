import React, { useState, useEffect, useRef } from 'react';
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
  const [dragActive, setDragActive] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef(null);
  const maxDescription = 500;

  useEffect(()=>{ if(success){ const t=setTimeout(()=>setSuccess(false),3000); return ()=>clearTimeout(t);} },[success]);

  if (!isLoaded) return <div className="text-sm text-gray-500">Loading...</div>;
  if (!user) return <div className="text-sm text-gray-500">Please sign in to submit a report.</div>;

  const handleFile = (file) => {
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, image: reader.result }));
    reader.readAsDataURL(file);
    setShowPreview(true);
  };

  const onChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'image' && files?.[0]) {
      handleFile(files[0]);
    } else {
      setForm(f => ({ ...f, [name]: name === 'description' ? value.slice(0,maxDescription) : value }));
    }
  };

  const onDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    if (e.type === 'dragleave') setDragActive(false);
  };

  const onDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
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
    setShowPreview(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in px-3 sm:px-4">
      <style>{`
        .animate-fade-in{animation:fade-in .5s ease both;}
        @keyframes fade-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .animate-in-up{animation:in-up .4s ease both;}
        @keyframes in-up{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .progress-bar{animation:load 1.2s ease-in-out infinite;}
        @keyframes load{0%{transform:translateX(-100%)}50%{transform:translateX(0)}100%{transform:translateX(100%)}}
      `}</style>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Submit a Report</h1>
        <p className="text-sm text-gray-600">Provide detailed information so authorities can act faster.</p>
      </div>
      <form onSubmit={onSubmit} onDragEnter={onDrag} className="relative space-y-6 bg-white/80 dark:bg-white/70 backdrop-blur rounded-xl border border-gray-200 p-6 shadow-sm overflow-hidden">
        {submitting && (
          <div className="absolute top-0 left-0 right-0 h-1 overflow-hidden bg-gradient-to-r from-indigo-200 via-indigo-400/40 to-indigo-200">
            <div className="progress-bar h-full w-1/2 bg-indigo-600/80 blur-[1px]" />
          </div>
        )}
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
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Description<span className="text-rose-500">*</span></label>
              <span className={`text-[11px] ${form.description.length >= maxDescription ? 'text-rose-600 font-medium' : 'text-gray-500'}`}>{form.description.length}/{maxDescription}</span>
            </div>
            <textarea name="description" value={form.description} onChange={onChange} required rows={5} className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 text-sm resize-none" placeholder="Describe the issue, impact, urgency..." />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">Photo <span className="text-gray-400 font-normal text-xs">(optional)</span></label>
            <div
              onDragEnter={onDrag}
              onDragOver={onDrag}
              onDragLeave={onDrag}
              onDrop={onDrop}
              className={`relative group border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer focus-within:ring-2 focus-within:ring-indigo-500/60 ${dragActive ? 'border-indigo-400 bg-indigo-50/60' : 'border-gray-300 bg-white/50 hover:border-indigo-400/70'}`}
              onClick={()=>fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" name="image" accept="image/*" onChange={onChange} className="hidden" />
              {!form.image && (
                <div className="space-y-1">
                  <p className="text-sm text-gray-700 font-medium">Drag & Drop or Click to Upload</p>
                  <p className="text-[11px] text-gray-500">PNG / JPG up to ~2MB (client-side only)</p>
                </div>
              )}
              {form.image && showPreview && (
                <div className="relative">
                  <img src={form.image} alt="Preview" className="mx-auto h-44 w-auto rounded-lg object-cover border border-gray-200 shadow-sm" />
                  <button type="button" onClick={(e)=>{ e.stopPropagation(); setForm(f=>({...f,image:null})); setShowPreview(false); }} className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full w-7 h-7 text-[10px] font-medium shadow hover:bg-rose-500 active:scale-95 transition">✕</button>
                </div>
              )}
              {form.image && !showPreview && (
                <button type="button" onClick={(e)=>{e.stopPropagation(); setShowPreview(true);}} className="text-xs mt-1 underline text-indigo-600">Show preview</button>
              )}
            </div>
          </div>
        </div>
        {error && <div className="text-sm text-rose-600 font-medium animate-in-up">{error}</div>}
        {success && <div className="text-sm text-emerald-600 font-medium animate-in-up">Report submitted successfully!</div>}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <button disabled={submitting} type="submit" className="relative inline-flex items-center justify-center gap-2 px-5 h-11 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition active:scale-95">
            {submitting && <span className="absolute left-4 inline-block h-4 w-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />}
            <span>{submitting ? 'Submitting...' : 'Submit Report'}</span>
          </button>
          <button type="button" disabled={submitting} onClick={()=>setForm({ title:'', category:'', location:'', description:'', image:null })} className="inline-flex items-center justify-center px-4 h-11 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 active:scale-95 transition disabled:opacity-50">Reset</button>
          <p className="text-xs text-gray-500 sm:ml-auto">Fields marked * are required.</p>
        </div>
      </form>
    </div>
  );
};

export default Report;