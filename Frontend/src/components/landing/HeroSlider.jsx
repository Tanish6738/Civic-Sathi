import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";

// Text-only animated hero replacing the old slider
// Focus: Animated "Nigam AI" word, tagline, supporting content.

export default function HeroSlider() {
  const containerRef = useRef(null);
  const glowRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Subtle entrance + ambient gradient motion (GSAP for performant animation)
    const ctx = gsap.context(() => {
      gsap.from(el, { opacity: 0, y: 28, duration: 1, ease: "power3.out" });
      gsap.to(glowRef.current, {
        backgroundPosition: "200% 50%",
        repeat: -1,
        ease: "none",
        duration: 18,
      });
    });
    return () => ctx.revert();
  }, []);

  const title = "Nigam AI"; // You can change casing or styling elsewhere
  const letters = title.split("");

  const letterVariants = {
    hidden: { y: "1.2em", opacity: 0, rotateX: -65 },
    visible: (i) => ({
      y: 0,
      opacity: 1,
      rotateX: 0,
      transition: {
        delay: i * 0.08,
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1],
      },
    }),
  };

  return (
    <section
      ref={containerRef}
      className="relative w-full min-h-[260px] sm:min-h-[360px] md:min-h-[480px] lg:min-h-[80vh] flex items-center justify-center overflow-hidden bg-slate-950 text-white px-4 md:px-8"
      aria-labelledby="hero-heading"
    >
      {/* Ambient animated gradient backdrop */}
      <div
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "linear-gradient(115deg, #0d1b4d, #1e3a8a, #312e81, #7e22ce, #1e3a8a, #0d1b4d)",
          backgroundSize: "300% 300%",
          mask: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.9), transparent 75%)",
          WebkitMask: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.9), transparent 75%)",
          filter: "blur(40px) saturate(140%)",
        }}
      />
      {/* Overlay gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/70" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent" />

      <div className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center gap-6">
        <h1
          id="hero-heading"
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight"
        >
          <span className="sr-only">Nigam AI</span>
          <motion.span
            className="inline-block bg-clip-text text-transparent select-none"
            style={{
              backgroundImage:
                "linear-gradient(90deg,#f97316 0%,#fb923c 18%,#e879f9 35%,#6366f1 55%,#0ea5e9 75%,#34d399 95%)",
              filter: "drop-shadow(0 4px 18px rgba(99,102,241,0.35))",
            }}
            initial="hidden"
            animate="visible"
            aria-hidden="true"
          >
            {letters.map((l, i) => (
              <motion.span
                key={i + l}
                custom={i}
                variants={letterVariants}
                className={`inline-block will-change-transform [perspective:600px] ${
                  l === " " ? "w-3 sm:w-4" : ""
                }`}
              >
                {l === " " ? "\u00A0" : l}
              </motion.span>
            ))}
          </motion.span>
        </h1>

        <motion.p
          className="max-w-2xl text-base sm:text-lg md:text-xl text-slate-200/90 font-light tracking-wide"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: letters.length * 0.08 + 0.2, duration: 0.8 }}
        >
          Intelligent civic engagement & issue resolution platform. Harness AI
          to surface insights, streamline reporting, and empower every citizen.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row gap-4 mt-2"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: letters.length * 0.08 + 0.4, duration: 0.7 }}
        >
            <a
              href="#report"
              className="group relative inline-flex items-center justify-center px-7 py-3 rounded-full font-medium text-white overflow-hidden bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 shadow-lg shadow-indigo-900/40 ring-1 ring-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-300 transition"
            >
              <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition" />
              <span className="relative">Report an Issue</span>
            </a>
            <a
              href="#learn"
              className="inline-flex items-center justify-center px-7 py-3 rounded-full font-medium text-slate-100 bg-white/10 hover:bg-white/15 backdrop-blur-md ring-1 ring-white/15 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-300"
            >
              Learn More
            </a>
        </motion.div>

        <motion.div
          className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-6 w-full max-w-3xl text-xs sm:text-sm text-slate-300/80"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: letters.length * 0.08 + 0.55, duration: 0.7 }}
        >
          {[
            ["Realtime Analytics", "Live issue clustering"],
            ["Smart Routing", "Faster resolutions"],
            ["Transparent", "Traceable progress"],
            ["Inclusive", "Citizen-first design"],
          ].map(([title, desc]) => (
            <div key={title} className="flex flex-col gap-1">
              <span className="text-slate-100 font-medium tracking-wide">
                {title}
              </span>
              <span className="text-slate-400/80 font-light">{desc}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Accessibility note for reduced motion users */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          [data-prefers-reduced-motion] { animation: none !important; transition: none !important; }
        }
      `}</style>
    </section>
  );
}
