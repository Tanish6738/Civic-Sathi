import { cardData } from "./landingData.jsx";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, useState, useEffect, useCallback } from "react";
gsap.registerPlugin(ScrollTrigger);

// Responsive visible card count helper (handles ultra-wide & tiny widths)
const calcVisible = () => {
  if (typeof window !== "undefined") {
    const w = window.innerWidth;
    if (w >= 1920) return 7;
    if (w >= 1680) return 6;
    if (w >= 1440) return 5;
    if (w >= 1100) return 4;
    if (w >= 820) return 3;
    if (w >= 560) return 2;
  }
  return 1;
};

export default function CardSlider() {
  const prefersReducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(calcVisible());
  const [index, setIndex] = useState(0); // slide index (group)
  const groups = Math.ceil(cardData.length / visible);
  const autoRef = useRef(null);
  const wrap = (val) => (val + groups) % groups;
  const containerRef = useRef(null);
  const trackRef = useRef(null);
  const pointer = useRef({
    startX: 0,
    delta: 0,
    dragging: false,
    startTime: 0,
  });
  const liveRef = useRef(null);

  // Resize handling
  useEffect(() => {
    const handle = () => setVisible(calcVisible());
    window.addEventListener("resize", handle);
    window.addEventListener("orientationchange", handle);
    return () => {
      window.removeEventListener("resize", handle);
      window.removeEventListener("orientationchange", handle);
    };
  }, []);
  useEffect(() => {
    setIndex((i) => (i >= groups ? 0 : i));
  }, [groups]);

  // Auto-play (pause on hover / focus)
  useEffect(() => {
    if (prefersReducedMotion) return;
    const start = () => {
      stop();
      autoRef.current = setInterval(() => setIndex((i) => wrap(i + 1)), 6000);
    };
    const stop = () => {
      if (autoRef.current) clearInterval(autoRef.current);
    };
    start();
    const node = containerRef.current;
    if (node) {
      node.addEventListener("mouseenter", stop);
      node.addEventListener("mouseleave", start);
      node.addEventListener("focusin", stop);
      node.addEventListener("focusout", start);
    }
    return () => {
      stop();
      if (node) {
        node.removeEventListener("mouseenter", stop);
        node.removeEventListener("mouseleave", start);
        node.removeEventListener("focusin", stop);
        node.removeEventListener("focusout", start);
      }
    };
  }, [prefersReducedMotion, groups, wrap]);

  // Scroll reveal animation
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.from(el.querySelectorAll("[data-card]"), {
        opacity: 0,
        y: 28,
        stagger: 0.08,
        duration: 0.7,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start: "top 80%",
        },
      });
    });
    return () => ctx.revert();
  }, [visible]);

  const go = useCallback((dir) => setIndex((i) => wrap(i + dir)), [wrap]);
  const jump = useCallback((i) => setIndex(wrap(i)), [wrap]);

  // Swipe / drag (basic)
  const onPointerDown = (e) => {
    pointer.current.startX = e.clientX || e.touches?.[0]?.clientX || 0;
    pointer.current.startTime = Date.now();
    pointer.current.dragging = true;
    pointer.current.delta = 0;
  };
  const onPointerMove = (e) => {
    if (!pointer.current.dragging) return;
    const x = e.clientX || e.touches?.[0]?.clientX || 0;
    pointer.current.delta = x - pointer.current.startX;
    if (trackRef.current) {
      trackRef.current.style.transition = "none";
      const percentDelta =
        (pointer.current.delta / (trackRef.current.clientWidth / groups)) * 100;
      trackRef.current.style.transform = `translateX(calc(-${index * 100}% + ${percentDelta}%))`;
    }
  };
  const onPointerUp = () => {
    if (!pointer.current.dragging) return;
    pointer.current.dragging = false;
    const { delta, startTime } = pointer.current;
    const elapsed = Date.now() - startTime;
    const threshold = 40; // px
    if (
      Math.abs(delta) > threshold ||
      (elapsed < 250 && Math.abs(delta) > 10)
    ) {
      if (delta < 0) go(1);
      else go(-1);
    } else {
      // snap back
      if (trackRef.current) {
        trackRef.current.style.transition =
          "transform .5s cubic-bezier(.4,0,.2,1)";
        trackRef.current.style.transform = `translateX(-${index * 100}%)`;
      }
    }
  };
  useEffect(() => {
    const upEvents = ["mouseup", "touchend", "pointerup", "mouseleave"];
    upEvents.forEach((ev) => window.addEventListener(ev, onPointerUp));
    return () =>
      upEvents.forEach((ev) => window.removeEventListener(ev, onPointerUp));
  });

  // Keyboard nav
  const onKey = (e) => {
    if (e.key === "ArrowRight") {
      go(1);
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      go(-1);
      e.preventDefault();
    }
  };

  // Live region update
  useEffect(() => {
    if (liveRef.current)
      liveRef.current.textContent = `Slide ${index + 1} of ${groups}`;
  }, [index, groups]);

  // Compute translate percentage for track (each group == 100%)
  const trackTranslate = index * 100;

  // Motion variants
  const cardV = {
    initial: { opacity: 0, y: 20, scale: 0.96 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <section
      ref={containerRef}
      aria-label="New services"
      className="relative w-full py-14 md:py-20 bg-white overflow-hidden select-none"
      onKeyDown={onKey}
    >
      <div className="mx-auto max-w-7fxl px-4 sm:px-6">
        <header className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6 mb-10">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-700 via-indigo-600 to-orange-500 bg-clip-text text-transparent">
              New in NigamAI
            </h2>
            <p className="mt-2 text-sm md:text-base text-gray-600 max-w-2xl">
              Explore recently added municipal services and streamlined digital
              workflows.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              aria-label="Previous"
              onClick={() => go(-1)}
              className="group relative inline-flex items-center justify-center h-11 w-11 rounded-xl border border-black text-black bg-white/80 backdrop-blur hover:border-blue-500 hover:text-blue-600 shadow-sm overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <ChevronLeft
                size={20}
                className="transition-transform group-active:scale-90"
              />
            </button>
            <button
              aria-label="Next"
              onClick={() => go(1)}
              className="group relative inline-flex items-center justify-center h-11 w-11 rounded-xl border border-black text-black bg-white/80 backdrop-blur hover:border-blue-500 hover:text-blue-600 shadow-sm overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <ChevronRight
                size={20}
                className="transition-transform group-active:scale-90"
              />
            </button>
          </div>
        </header>
        <div
          className="relative"
          role="group"
          aria-roledescription="carousel"
          aria-label="Service cards"
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white via-white/70 to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white via-white/70 to-transparent z-10" />
          <div
            className="overflow-hidden rounded-2xl ring-1 ring-gray-200/70 bg-white/60 backdrop-blur"
            onMouseDown={onPointerDown}
            onTouchStart={onPointerDown}
            onPointerDown={onPointerDown}
            onMouseMove={onPointerMove}
            onTouchMove={onPointerMove}
            onPointerMove={onPointerMove}
          >
            <div
              ref={trackRef}
              className="flex gap-5 will-change-transform touch-pan-y"
              style={{
                transform: `translateX(-${trackTranslate}%)`,
                transition: prefersReducedMotion
                  ? "none"
                  : "transform .8s cubic-bezier(.4,0,.2,1)",
              }}
            >
              {cardData.map((c, i) => {
                const groupIndex = Math.floor(i / visible);
                return (
                  <div
                    key={c.title + i}
                    data-card
                    style={{
                      flex: `0 0 calc((100% - ${(visible - 1) * 1.25}rem)/${visible})`,
                    }}
                    className="px-2.5 py-6 first:pl-6 last:pr-6"
                    aria-hidden={groupIndex !== index}
                  >
                    <motion.article
                      variants={cardV}
                      initial="initial"
                      animate="animate"
                      whileHover={{
                        y: -6,
                        boxShadow: "0 8px 30px -6px rgba(0,0,0,.07)",
                        scale: 1.015,
                      }}
                      whileTap={{ scale: 0.97 }}
                      className="h-full flex flex-col justify-between rounded-xl bg-white border border-gray-200/70 shadow-sm p-5 relative overflow-hidden"
                      tabIndex={0}
                    >
                      <div
                        className="absolute inset-0 pointer-events-none opacity-0 hover:opacity-100 transition-opacity"
                        style={{
                          background:
                            "radial-gradient(circle at 75% 15%, rgba(59,130,246,.12), transparent 70%)",
                        }}
                      />
                      <div className="flex items-start gap-4">
                        <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 text-lg shadow-inner ring-1 ring-blue-200/50">
                          {c.icon}
                        </div>
                        <div className="flex flex-col gap-1 min-w-0">
                          <h3 className="font-semibold text-sm md:text-base leading-snug text-gray-900 line-clamp-2 tracking-tight">
                            {c.title}
                          </h3>
                          <p className="text-[11px] md:text-xs text-gray-600 line-clamp-2">
                            {c.subtitle}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-end justify-between pt-4">
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          className="relative inline-flex items-center gap-1.5 bg-blue-600/95 hover:bg-blue-600 text-white text-[11px] md:text-xs font-medium px-3 py-1.5 rounded-md tracking-wide focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
                          aria-label={`View ${c.title}`}
                        >
                          <span>View</span>
                        </motion.button>
                        <span className="text-[10px] uppercase tracking-wider text-orange-600 font-semibold">
                          New
                        </span>
                      </div>
                    </motion.article>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Progress dots */}
          <div
            className="flex items-center justify-center gap-2 mt-6"
            aria-label="Slide navigation"
          >
            {Array.from({ length: groups }).map((_, i) => (
              <button
                key={i}
                onClick={() => jump(i)}
                aria-label={`Go to slide ${i + 1}`}
                className="group relative h-3"
              >
                <span
                  className={`block rounded-full transition-all duration-500 ${i === index ? "w-7 bg-gradient-to-r from-blue-600 to-orange-500 shadow-md" : "w-3 bg-gray-300 group-hover:bg-gray-400"} h-3`}
                />
              </button>
            ))}
          </div>
          <span ref={liveRef} aria-live="polite" className="sr-only" />
        </div>
        {/* Tag cloud */}
        <div
          className="flex flex-wrap justify-center gap-2 md:gap-3 mt-10"
          aria-label="Popular tags"
        >
          {[
            "Grievances",
            "Bill Tracking",
            "Citizen Charter",
            "Tree Cutting NOC",
            "Business Licenses",
            "Environmental Approvals",
          ].map((tag, i) => (
            <motion.span
              key={tag + i}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.9 }}
              className="px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs md:text-sm font-medium tracking-tight cursor-pointer hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            >
              {tag}
            </motion.span>
          ))}
        </div>
      </div>
      {/* Decorative blur */}
      <div className="pointer-events-none absolute -top-12 right-0 w-72 h-72 bg-gradient-to-br from-blue-400/20 via-indigo-400/10 to-orange-400/10 blur-3xl" />
    </section>
  );
}
