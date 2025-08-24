import React, { useState } from 'react';

export default function AfterPhotosUploader({ value = [], onChange, max = 10 }) {
  const [local, setLocal] = useState(value);

  function handleAdd(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const urls = files.map(f => ({ url: URL.createObjectURL(f), file: f }));
    const merged = [...local, ...urls].slice(0, max);
    setLocal(merged);
    onChange && onChange(merged);
  }
  function remove(idx) {
    const next = local.filter((_,i)=> i!==idx);
    setLocal(next); onChange && onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Completion Photos <span className="text-xs text-soft/60">({local.length}/{max})</span></span>
        <label className="inline-flex items-center gap-1 h-8 px-3 rounded-md bg-primary text-white text-xs cursor-pointer hover:bg-primary/90">
          <input type="file" multiple accept="image/*" className="hidden" onChange={handleAdd} />
          Add
        </label>
      </div>
      <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 gap-2">
        {local.map((p,i)=>(
          <div key={i} className="relative group aspect-square rounded-md overflow-hidden border border-default bg-surface-100">
            <img src={p.url} alt="after" className="object-cover w-full h-full" />
            <button onClick={()=> remove(i)} className="absolute top-1 right-1 text-[10px] bg-black/60 text-white rounded px-1 opacity-0 group-hover:opacity-100 transition">×</button>
          </div>
        ))}
        {local.length === 0 && <div className="col-span-full text-xs text-soft/60">No photos yet.</div>}
      </div>
    </div>
  );
}
