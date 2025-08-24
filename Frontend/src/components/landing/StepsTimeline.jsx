import React, { useEffect, useRef } from "react";
import { steps, stepDescriptions } from "./landingData.jsx";
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

export default function StepsTimeline() {
  const sectionRef = useRef(null);
  const stepRefs = useRef([]);
  const progressRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const items = stepRefs.current.filter(Boolean);
    // reduced motion: fade in on intersection only
    if (prefersReduce) {
      items.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(16px)';
        el.style.transition = 'opacity .6s ease, transform .6s ease';
      });
      const io = new IntersectionObserver(entries => {
        entries.forEach(ent => {
          if (ent.isIntersecting) {
            ent.target.style.opacity = '1';
            ent.target.style.transform = 'translateY(0)';
            io.unobserve(ent.target);
          }
        });
      }, { threshold: 0.2 });
      items.forEach(i => io.observe(i));
      return () => io.disconnect();
    }

    const ctx = gsap.context(() => {
      gsap.set(items, { opacity: 0, y: 40, rotateX: 15, transformPerspective: 900 });
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top 75%',
          end: 'bottom center',
          scrub: 0.9,
        }
      });
      tl.to(items, {
        opacity: 1,
        y: 0,
        rotateX: 0,
        ease: 'power3.out',
        stagger: { each: 0.12 }
      });
      // horizontal progress (desktop)
      if (progressRef.current) {
        gsap.fromTo(progressRef.current, { scaleX: 0 }, {
          scaleX: 1,
          transformOrigin: '0% 50%',
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top 70%',
            end: 'bottom 40%',
            scrub: true
          }
        });
      }
      // chain event for next section
      tl.add(() => window.dispatchEvent(new CustomEvent('steps:revealComplete')));
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const cardVariants = {
    rest: { y: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.06),0 1px 2px rgba(0,0,0,0.04)' },
    hover: { y: -6, boxShadow: '0 8px 28px -6px rgba(0,0,0,0.08)', transition: { duration: .35, ease: 'easeOut' } }
  };

  return (
    <section ref={sectionRef} aria-labelledby="steps-heading" className="w-full bg-gradient-to-b from-white via-[#f6f4ff] to-white py-16 sm:py-20 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-gradient-to-br from-blue-300/30 to-indigo-300/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-140px] right-[-100px] w-96 h-96 rounded-full bg-gradient-to-tr from-orange-200/40 to-pink-200/30 blur-3xl" />
      <div className="relative max-w-6xl mx-auto px-5 sm:px-6">
        <header className="text-center mb-14" data-headline>
          <h2 id="steps-heading" className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 leading-tight">
            Getting started is <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500">simple</span>
          </h2>
          <p className="mt-4 text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
            Begin using <span className="font-semibold text-blue-600">NigamAI</span> in a few guided steps — optimized across devices.
          </p>
        </header>
        <ol role="list" className="relative flex flex-col gap-12 sm:gap-10 sm:flex-row sm:items-stretch md:gap-12">
          {/* Horizontal progress line (desktop) */}
          <div aria-hidden="true" className="hidden sm:block absolute top-12 left-0 right-0 h-px bg-gray-200/70">
            <div ref={progressRef} className="absolute inset-y-0 left-0 h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 rounded-full" style={{ transform: 'scaleX(0)' }} />
          </div>
          {steps.map((step, index) => (
            <li key={index} ref={el => (stepRefs.current[index] = el)} className="relative group flex sm:flex-1">
              {/* Vertical connector on mobile */}
              {index !== steps.length - 1 && <span aria-hidden="true" className="sm:hidden absolute left-7 top-16 bottom-[-32px] w-px bg-gradient-to-b from-blue-200 via-indigo-200 to-orange-200" />}
              <motion.div
                variants={cardVariants}
                initial="rest"
                whileHover="hover"
                whileFocus="hover"
                className="flex flex-col sm:items-center sm:text-center text-left w-full"
              >
                <div className="relative w-16 h-16 mx-0 sm:mx-auto">
                  <span className="absolute inset-0 rounded-2xl bg-white shadow-md ring-1 ring-blue-100 flex items-center justify-center text-3xl transition-all duration-300 group-hover:shadow-blue-200/70 group-hover:scale-105">
                    {step.icon}
                  </span>
                  <span className="absolute -top-2 -right-2 bg-gradient-to-br from-blue-600 to-orange-500 text-white text-[10px] font-semibold px-2 py-[2px] rounded-full shadow-sm">
                    {index + 1}
                  </span>
                </div>
                <h3 className="mt-6 font-semibold text-gray-800 text-sm sm:text-base md:text-lg tracking-tight group-hover:text-blue-700 transition-colors">
                  {step.label}
                </h3>
                <p className="mt-2 text-xs sm:text-[13px] md:text-sm text-gray-500 max-w-[15rem] sm:max-w-[12rem] md:max-w-xs leading-relaxed">
                  {stepDescriptions[index]}
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <button className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-[#f6f4ff]">
                    Start <span className="text-xs">→</span>
                  </button>
                  {index === 0 && (
                    <button className="hidden sm:inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-[#f6f4ff]">
                      Why register?
                    </button>
                  )}
                </div>
              </motion.div>
              {index < steps.length - 1 && (
                <span className="hidden sm:flex absolute top-11 right-[-22px] text-gray-300 text-2xl group-hover:text-gray-400 transition-colors">
                  ➝
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
