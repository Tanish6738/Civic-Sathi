import React, { useEffect, useRef } from "react";
import { services } from "./landingData.jsx";
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

export default function ServicesList() {
  const sectionRef = useRef(null);
  const cardsRef = useRef([]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cards = cardsRef.current.filter(Boolean);

    // Fallback / reduced-motion path using IntersectionObserver (no gsap timeline heavy effects)
    if (prefersReduce || !gsap) {
      cards.forEach(c => {
        c.style.opacity = '0';
        c.style.transform = 'translateY(20px)';
        c.style.transition = 'opacity .6s ease, transform .6s ease';
      });
      const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            io.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });
      cards.forEach(c => io.observe(c));
      return () => io.disconnect();
    }

    // GSAP enhanced path
    const ctx = gsap.context(() => {
      gsap.set(cards, { opacity: 0, y: 56, rotateX: 18, transformPerspective: 900 });
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top 75%',
          end: '+=420',
          scrub: 0.9,
        }
      });
      tl.to(cards, {
        opacity: 1,
        y: 0,
        rotateX: 0,
        ease: 'power3.out',
        stagger: { each: 0.08 }
      }).add(() => {
        // Dispatch custom event for sequential chaining with next sections
        window.dispatchEvent(new CustomEvent('services:revealComplete'));
      });
      // Parallax float (lighter) - tie to global scroll independent of scrub timeline
      cards.forEach(card => {
        gsap.to(card, {
          y: -18,
          ease: 'none',
          scrollTrigger: {
            trigger: card,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true
          }
        });
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} aria-label="Available services" className="px-6 md:px-12 lg:px-16 py-14 md:py-20 relative">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-700 via-indigo-600 to-orange-500 text-transparent bg-clip-text">Core Services</h2>
          <p className="mt-3 text-sm md:text-base text-gray-600 max-w-2xl mx-auto">Browse the most used municipal services. More workflows are added regularly.</p>
        </header>
        <div className="flex flex-wrap gap-5 md:gap-6 justify-center">
          {services.map((s, i) => (
            <div
              key={i}
              ref={el => (cardsRef.current[i] = el)}
              className="service-card relative group flex items-center px-5 md:px-6 py-4 md:py-5 bg-white/90 backdrop-blur rounded-2xl border border-gray-200 shadow-sm cursor-pointer transition-all duration-400 will-change-transform hover:shadow-lg hover:border-blue-300 hover:-translate-y-1 min-h-[92px] w-[min(100%,260px)] md:w-[260px]"
            >
              <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 text-xl shadow-inner ring-1 ring-blue-200/60">
                {s.icon}
              </div>
              <div className="ml-4 pr-2">
                <h3 className="font-semibold text-gray-800 text-sm md:text-base leading-snug tracking-tight">{s.name}</h3>
                <span className="mt-1 block h-[3px] w-0 rounded-full bg-gradient-to-r from-blue-600 to-orange-500 transition-all duration-500 group-hover:w-12" />
              </div>
              {/* Hover sheen without obscuring content */}
              <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'linear-gradient(120deg, rgba(59,130,246,0.10), rgba(255,255,255,0.0) 40%, rgba(249,115,22,0.10))' }} />
            </div>
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute -top-10 left-0 w-64 h-64 bg-blue-400/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-72 h-72 bg-orange-400/10 blur-3xl" />
    </section>
  );
}
