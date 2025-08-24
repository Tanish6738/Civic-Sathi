import React, { useEffect, useState, useRef } from "react";
import { images } from "./landingData.jsx";
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

export default function HeroSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setCurrentIndex(p => (p === images.length - 1 ? 0 : p + 1)), 4000);
    return () => clearInterval(timer);
  }, []);
  const prev = () => setCurrentIndex(p => (p === 0 ? images.length - 1 : p - 1));
  const next = () => setCurrentIndex(p => (p === images.length - 1 ? 0 : p + 1));

  const containerRef = useRef(null);
  const slideRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.from(el, { opacity: 0, scale: 0.98, duration: 1, ease: 'power3.out' });
      gsap.to(el, {
        '--overlay-blur': 14,
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: '+=600',
          scrub: true,
        }
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-[260px] sm:h-[340px] md:h-[430px] lg:h-[500px] overflow-hidden z-0 shadow-xl bg-gradient-to-br from-blue-700 via-indigo-700 to-blue-900">
      <AnimatePresence mode="wait">
        <motion.img
          key={currentIndex}
            ref={slideRef}
          src={images[currentIndex]}
          alt={`Hero slide ${currentIndex + 1}`}
          className="absolute inset-0 w-full h-full object-cover md:object-cover"
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          loading="lazy"
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent mix-blend-multiply pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 60% 40%, rgba(255,255,255,0.12), transparent 60%)' }} />
      <button onClick={prev} aria-label="Previous Slide" className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-md text-white p-3 sm:p-4 rounded-full shadow-lg hover:bg-white/30 hover:scale-110 active:scale-95 transform transition duration-300 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
        <span className="text-2xl font-bold">❮</span>
      </button>
      <button onClick={next} aria-label="Next Slide" className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-md text-white p-3 sm:p-4 rounded-full shadow-lg hover:bg-white/30 hover:scale-110 active:scale-95 transform transition duration-300 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
        <span className="text-2xl font-bold">❯</span>
      </button>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-3 z-10">
        {images.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setCurrentIndex(i)}
            className={`group h-3 w-3 rounded-full transition-all duration-500 ring-1 ring-white/40 hover:ring-white/80 relative overflow-hidden ${i === currentIndex ? 'bg-white scale-125 shadow-lg' : 'bg-white/40'}`}
          >
            {i === currentIndex && (
              <motion.span
                layoutId="slider-dot"
                className="absolute inset-0 bg-gradient-to-r from-orange-500 to-blue-600 mix-blend-overlay"
                initial={false}
                animate={{ opacity: 0.9 }}
                transition={{ duration: 0.6 }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
