import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
// Base reusable tailwind class string for category cards
const baseCard = "group relative w-full flex items-start gap-4 rounded-2xl bg-white border border-gray-200 p-4 md:p-5 shadow-sm hover:shadow-md hover:border-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 transition overflow-hidden text-left min-h-[150px]";
// Backend-driven categories
import { getCategories } from '../../services/category.services';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronRight, X, RefreshCw, Filter } from 'lucide-react';
gsap.registerPlugin(ScrollTrigger);

// Animation variants
const containerV = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.15 } }
};
const itemV = {
  hidden: { opacity: 0, y: 18, scale: .96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: .5, ease: 'easeOut' } }
};

// Small presentational sub‑component for a category (motion wrapped for stagger & focus styles)
// Predefined gradient pairs for visual diversity (accessible contrast against white)
const GRADIENTS = [
  ['from-blue-500', 'to-indigo-500'],
  ['from-indigo-500', 'to-fuchsia-500'],
  ['from-emerald-500', 'to-teal-500'],
  ['from-amber-500', 'to-orange-500'],
  ['from-rose-500', 'to-pink-500'],
  ['from-cyan-500', 'to-sky-500']
];

function gradientForName(name = '') {
  const hash = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const idx = hash % GRADIENTS.length;
  const [fromCls, toCls] = GRADIENTS[idx];
  return { idx, gradientClasses: `bg-gradient-to-br ${fromCls} ${toCls}`, barClasses: `bg-gradient-to-r ${fromCls} ${toCls}` };
}

function CategoryCard({ cat }) {
  const accent = useMemo(() => gradientForName(cat.name), [cat.name]);
  const cardRef = useRef(null);
  const prefersReduced = useRef(typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const handleMove = (e) => {
    if (prefersReduced.current) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rx = ((y / rect.height) - 0.5) * 10; // tilt range
    const ry = ((x / rect.width) - 0.5) * -10;
    el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
  };
  const resetTilt = () => {
    const el = cardRef.current;
    if (el) el.style.transform = '';
  };

  return (
    <motion.button
      ref={cardRef}
      className={`${baseCard} will-change-transform`}
      aria-label={`Open ${cat.name} form`}
      whileHover={{ boxShadow: '0 12px 32px -8px rgba(0,0,0,0.15),0 4px 12px -2px rgba(0,0,0,0.08)' }}
      whileTap={{ scale: 0.97, boxShadow: '0 4px 14px -4px rgba(0,0,0,0.12)' }}
      onMouseMove={handleMove}
      onMouseLeave={resetTilt}
      onBlur={resetTilt}
      data-accent={accent.idx}
    >
      {/* Accent bar + glow */}
      <span className={`absolute top-0 left-0 h-1 w-full ${accent.barClasses} opacity-80`} />
      <span className={`pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 ${accent.gradientClasses} mix-blend-overlay`} />
      {/* Icon / initial */}
      <span className={`relative flex items-center justify-center w-12 h-12 rounded-xl text-white shadow-inner ring-1 ring-white/40 ${accent.gradientClasses}`}>
        <span className="drop-shadow-sm font-semibold text-base">
          {cat.icon || cat.name.charAt(0).toUpperCase()}
        </span>
      </span>
      {/* Text */}
      <span className="relative flex-1 min-w-0">
        <span className="block font-semibold text-sm md:text-base text-gray-800 leading-snug tracking-tight line-clamp-2 min-h-[42px]">
          {cat.name}
        </span>
        <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-blue-600/80 group-hover:text-blue-600">
          Start <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </span>
      {/* Hover actions */}
      <span className="pointer-events-none absolute inset-0 rounded-2xl ring-0 group-hover:ring-2 ring-blue-500/40 transition-all" />
    </motion.button>
  );
}

export default function CategoriesGrid() {
  const sectionRef = useRef(null);
  const mobileScrollerRef = useRef(null);
  const chipRefs = useRef([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [cats, setCats] = useState([]);
  const [error, setError] = useState('');
  const [focusedChip, setFocusedChip] = useState(-1);
  const [sort, setSort] = useState('alpha');

  // Derived sorted + filtered categories
  const filtered = useMemo(() => {
    const base = !query.trim()
      ? cats
      : cats.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));
    if (sort === 'alpha') return [...base].sort((a,b)=>a.name.localeCompare(b.name));
    if (sort === 'recent') return base; // placeholder for future meta
    return base;
  }, [cats, query, sort]);

  useEffect(() => {
    let cancelled = false;
    async function load(){
      setLoading(true); setError('');
      try { const data = await getCategories(); if(!cancelled) setCats(data || []); }
      catch(e){ if(!cancelled) setError(e?.response?.data?.message || 'Failed to load categories'); }
      finally { if(!cancelled) setLoading(false); }
    }
    load();
    return ()=>{ cancelled = true; };
  },[]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.from(el.querySelector('[data-headline]'), { opacity: 0, y: 24, duration: .7, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 80%' } });
    });
    return () => ctx.revert();
  }, []);

  // Keyboard navigation for mobile chip list
  const onChipKey = useCallback((e, idx) => {
    if (!['ArrowRight','ArrowLeft','Home','End'].includes(e.key)) return;
    e.preventDefault();
    let next = idx;
    if (e.key === 'ArrowRight') next = (idx + 1) % filtered.length;
    if (e.key === 'ArrowLeft') next = (idx - 1 + filtered.length) % filtered.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = filtered.length - 1;
    setFocusedChip(next);
    const btn = chipRefs.current[next];
    if (btn) {
      btn.focus();
      // ensure visibility
      btn.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
    }
  }, [filtered.length]);

  useEffect(() => {
    if (focusedChip < 0 && filtered.length) {
      setFocusedChip(0);
    }
  }, [filtered, focusedChip]);

  const hasResults = filtered.length > 0;
  const showEmpty = !loading && !error && !hasResults;

  return (
  <section ref={sectionRef} aria-labelledby="categories-heading" className="relative w-full py-14 md:py-20 bg-white" role="region">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-10 -left-10 w-56 h-56 bg-blue-400/10 blur-3xl rounded-full" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-72 h-72 bg-orange-400/10 blur-3xl rounded-full" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <header className="text-center max-w-3xl mx-auto mb-10" data-headline>
          <p className="inline-flex items-center gap-2 text-[11px] tracking-wider font-semibold uppercase text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">Explore</p>
          <h2 id="categories-heading" className="mt-5 text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">Fill Application Form</h2>
          <p className="mt-3 text-sm md:text-base text-gray-600 leading-relaxed">
            With <span className="font-semibold text-blue-600">NigamAI</span> you can complete municipal application forms using natural <strong>voice</strong> or classic input. Pick a service to begin.
          </p>
          {/* Toolbar */}
          <div className="mt-8">
            <div className="mx-auto flex flex-col sm:flex-row gap-4 sm:items-center justify-center">
              <div className="relative max-w-xs w-full">
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search services..."
                  aria-label="Search categories"
                  className="peer w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500 transition shadow-sm placeholder:text-gray-400"
                />
                {query && (
                  <button
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-xs font-medium px-2 py-1 rounded-md hover:bg-gray-100"
                  ><X size={14} /></button>
                )}
              </div>
              <div className="flex items-center gap-3 justify-center">
                <div className="relative">
                  <select
                    value={sort}
                    onChange={e=>setSort(e.target.value)}
                    aria-label="Sort categories"
                    className="appearance-none pr-9 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500 shadow-sm"
                  >
                    <option value="alpha">Alphabetical</option>
                    <option value="recent">Recently Added</option>
                  </select>
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-400">▾</span>
                </div>
                <button
                  type="button"
                  onClick={()=>{ setQuery(''); setSort('alpha'); }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-600 hover:text-gray-800 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
                  aria-label="Reset filters"
                >
                  <RefreshCw size={14} /> Reset
                </button>
              </div>
            </div>
            <p className="mt-3 text-[11px] tracking-wide text-gray-500 flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1"><Filter size={12} />{filtered.length} service{filtered.length !== 1 && 's'} shown</span>
              {loading && <span className="text-blue-600 animate-pulse">Loading…</span>}
              {error && <span className="text-rose-600">· {error}</span>}
            </p>
          </div>
        </header>

        {/* Mobile horizontal scroll (chips) */}
        <div className="md:hidden -mx-4 mb-8 overflow-x-auto pb-2" data-lenis-prevent ref={mobileScrollerRef}>
          <div className="flex gap-3 px-4 min-w-max snap-x snap-mandatory" role="listbox" aria-label="Service categories">
            {(loading ? Array.from({ length: 6 }) : filtered).map((cat, i) => {
              const key = loading ? i : (cat?._id || cat?.id || cat?.name || i);
              return (
              <div key={key} role="option" aria-selected={focusedChip === i} className="snap-start first:pl-1">
                {loading ? (
                  <div className="relative overflow-hidden rounded-full bg-white border border-gray-200 shadow-sm w-40 h-10 flex items-center gap-2 px-4 py-2 text-xs">
                    <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse" />
                    <div className="flex-1 h-3 rounded bg-gray-200 animate-pulse" />
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_1.4s_linear_infinite]" />
                  </div>
                ) : (
                  <button
                    ref={el => (chipRefs.current[i] = el)}
                    onKeyDown={(e) => onChipKey(e, i)}
                    className={`group relative flex items-center gap-2 px-4 py-2 rounded-full bg-white border ${focusedChip===i? 'border-blue-400 shadow':'border-gray-200'} shadow-sm hover:border-blue-300 text-xs font-medium text-gray-700 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 active:scale-95 transition`}
                    aria-label={`Open ${cat.name} form`}
                  >
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 ring-1 ring-blue-200 text-blue-600 text-[11px]">{cat.icon}</span>
                    <span className="truncate max-w-[140px] text-left">{cat.name}</span>
                  </button>
                )}
              </div>
            )})}
          </div>
        </div>

        {/* Desktop / tablet grid */}
        <motion.ul
          variants={containerV}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '0px 0px -80px 0px' }}
          className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5"
          aria-describedby="categories-heading"
        >
          {loading && Array.from({ length: 8 }).map((_, i) => (
            <li key={i} className="list-none">
              <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 md:p-5 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-gray-200" />
                <div className="flex-1 space-y-2 py-3">
                  <div className="h-3 w-2/3 rounded bg-gray-200" />
                  <div className="h-3 w-1/3 rounded bg-gray-200" />
                  <div className="h-3 w-1/2 rounded bg-gray-200" />
                </div>
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_1.5s_linear_infinite]" />
              </div>
            </li>
          ))}
          {!loading && hasResults && filtered.map(cat => {
            const key = cat._id || cat.id || cat.name; // stable key
            return (
              <motion.li key={key} variants={itemV} className="list-none">
                <CategoryCard cat={cat} />
              </motion.li>
            );
          })}
          {showEmpty && (
            <li className="col-span-full flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center ring-1 ring-blue-100 font-semibold text-xl">Ø</div>
              <p className="text-sm text-gray-500 max-w-sm">No services match your search. Try adjusting the keyword or resetting filters.</p>
              <button
                onClick={()=>{ setQuery(''); setSort('alpha'); }}
                className="inline-flex items-center gap-1.5 text-xs font-medium rounded-md bg-blue-600 text-white px-4 py-2 shadow hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
              >Reset Filters</button>
            </li>
          )}
          {!loading && error && (
            <li className="col-span-full flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-semibold">!</div>
              <p className="text-sm text-rose-600">{error}</p>
              <button
                onClick={()=>{ setQuery(''); setError(''); setCats([]); setLoading(true); (async ()=>{ try{ const d=await getCategories(); setCats(d||[]);}catch(e){ setError(e?.response?.data?.message||'Failed again');} finally{ setLoading(false);} })(); }}
                className="inline-flex items-center gap-1.5 text-xs font-medium rounded-md border border-rose-300 bg-white text-rose-700 px-4 py-2 shadow-sm hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60"
              >Retry</button>
            </li>
          )}
        </motion.ul>

        <div className="flex justify-center mt-10">
          <button disabled={loading} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium shadow-sm hover:bg-blue-500 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 transition">
            More Services
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
