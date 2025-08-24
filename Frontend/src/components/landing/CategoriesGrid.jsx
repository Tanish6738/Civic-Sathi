import React, { useEffect, useRef, useState, useCallback } from "react";
  const baseCard = "group relative w-full flex items-start gap-4 rounded-2xl bg-white border border-gray-200 p-4 md:p-5 shadow-sm hover:shadow-md hover:border-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 transition overflow-hidden text-left min-h-[150px]";
// Backend-driven categories
import { getCategories } from '../../services/category.services';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronRight } from 'lucide-react';
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

export default function CategoriesGrid() {
  const sectionRef = useRef(null);
  const mobileScrollerRef = useRef(null);
  const chipRefs = useRef([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [cats, setCats] = useState([]);
  const [error, setError] = useState('');
  const [focusedChip, setFocusedChip] = useState(-1);

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

  const filtered = !query.trim()
    ? cats
    : cats.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));

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

  return (
    <section ref={sectionRef} aria-labelledby="categories-heading" className="relative w-full py-14 md:py-20 bg-gradient-to-b from-blue-50/40 via-white to-white">
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
          {/* Search / filter */}
          <div className="mt-6">
            <div className="relative max-w-sm mx-auto">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search a service..."
                aria-label="Search categories"
                className="w-full rounded-xl border border-gray-300 bg-white/70 backdrop-blur px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500 transition shadow-sm"
              />
              {query && (
                <button
                  aria-label="Clear search"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 text-xs font-medium px-2 py-1 rounded-md hover:bg-gray-100"
                >✕</button>
              )}
            </div>
            <p className="mt-2 text-[11px] tracking-wide text-gray-500">{filtered.length} service{filtered.length !== 1 && 's'} found {error && <span className="text-rose-600">· {error}</span>}</p>
          </div>
        </header>

        {/* Mobile horizontal scroll (chips) */}
        <div className="md:hidden -mx-4 mb-8 overflow-x-auto pb-2" data-lenis-prevent ref={mobileScrollerRef}>
          <div className="flex gap-3 px-4 min-w-max" role="listbox" aria-label="Service categories">
            {(loading ? Array.from({ length: 6 }) : filtered).map((cat, i) => (
              <div key={cat?.id || i} role="option" aria-selected={focusedChip === i}>
                {loading ? (
                  <div className="animate-pulse flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm text-xs w-40 h-10">
                    <div className="w-6 h-6 rounded-full bg-gray-200" />
                    <div className="flex-1 h-3 rounded bg-gray-200" />
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
            ))}
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
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <li key={i} className="list-none">
                  <div className={`animate-pulse ${baseCard}`}>
                    <div className="w-12 h-12 rounded-xl bg-gray-200" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3 w-2/3 rounded bg-gray-200" />
                      <div className="h-3 w-1/3 rounded bg-gray-200" />
                      <div className="h-3 w-1/2 rounded bg-gray-200" />
                    </div>
                  </div>
                </li>
              ))
            : filtered.map(cat => (
              <motion.li key={cat.id} variants={itemV} className="list-none">
                <button
                  className={baseCard}
                  aria-label={`Open ${cat.name} form`}
                >
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-blue-50 via-white to-orange-50" />
                  <span className={`relative flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 ring-1 ring-blue-100 shadow-sm text-blue-700`}>{cat.name.charAt(0).toUpperCase()}</span>
                  <span className="relative flex-1 min-w-0">
                    <span className="block font-semibold text-sm md:text-base text-gray-800 leading-snug tracking-tight line-clamp-2 min-h-[42px]">{cat.name}</span>
                    <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-blue-600/80 group-hover:text-blue-600">Start <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" /></span>
                  </span>
                </button>
              </motion.li>
            ))}
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
