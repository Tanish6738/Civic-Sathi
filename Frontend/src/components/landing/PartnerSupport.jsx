import React, { useEffect, useRef } from "react";
import { Phonephoto, Qrcode } from "./landingData.jsx";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

// Motion variants for framer-motion elements
const cardVariants = {
  hidden: { y: 40, opacity: 0, scale: 0.96 },
  visible: (i) => ({
    y: 0,
    opacity: 1,
    scale: 1,
    transition: { delay: 0.1 + i * 0.08, duration: 0.6, ease: "easeOut" },
  }),
};

export default function PartnerSupport() {
  const sectionRef = useRef(null);
  const progressRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      // Progress bar only (cards handled by framer-motion). Keeping this light avoids double-control of opacity.
      if (!prefersReduced && progressRef.current) {
        gsap.fromTo(
          progressRef.current,
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          }
        );
      }
    }, section);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="partner-support-heading"
      className="relative w-full bg-white py-20 md:py-28 overflow-hidden"
    >
      {/* subtle background accents */}
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_10%_20%,rgba(59,130,246,0.08),transparent_60%),radial-gradient(circle_at_90%_80%,rgba(249,115,22,0.08),transparent_65%)]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-px bg-gradient-to-r from-transparent via-blue-300/40 to-transparent" />
      <div className="relative max-w-7xl mx-auto px-6 md:px-8">
        <header className="mb-14 text-center">
          <h2 id="partner-support-heading" className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-700 via-indigo-700 to-orange-500 bg-clip-text text-transparent">
            Partnerships & Citizen Support
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-sm md:text-base text-gray-600">
            Collaborate to extend next‑generation civic platforms and keep citizens supported every moment.
          </p>
        </header>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
          {/* Partner Program */}
          <motion.article
            className="partner-support-card relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-400 to-amber-300 shadow-md ring-1 ring-orange-300/40 flex flex-col sm:flex-row items-center p-8 gap-8 group"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={cardVariants}
            custom={0}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-25 transition-opacity duration-500 bg-[radial-gradient(circle_at_30%_20%,#ffffff_0%,transparent_70%)]" />
            <div className="flex flex-col flex-1 relative z-10">
              <span className="mb-2 inline-block text-[11px] tracking-wider font-semibold text-blue-900/80 bg-white/70 px-2 py-1 rounded-full shadow-sm">
                PARTNER PROGRAM
              </span>
              <h3 className="text-2xl md:text-3xl font-bold text-blue-900 leading-snug">
                Become a NigamAI Municipal Partner
              </h3>
              <p className="text-blue-950/90 mt-4 text-sm md:text-base max-w-md">
                Integrate <strong>voice‑based civic services</strong> and accelerate digital governance with seamless citizen engagement.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <motion.button
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-2 bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow hover:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-700 transition"
                >
                  Get Integrated <span className="text-xs">→</span>
                </motion.button>
                <motion.button
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm text-blue-900 text-sm font-medium px-5 py-2.5 rounded-lg shadow-sm hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-400/40 transition"
                >
                  Learn More
                </motion.button>
              </div>
            </div>
            <div className="flex justify-end relative z-10">
              <img
                src="https://img1.digitallocker.gov.in/digilocker-landing-page/assets/img/partner-img-1.png"
                alt="Partner illustration"
                className="w-40 md:w-48 drop-shadow-md select-none pointer-events-none"
                loading="lazy"
              />
            </div>
          </motion.article>
          {/* Support */}
          <motion.article
            className="partner-support-card relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 via-white to-gray-100 shadow-md ring-1 ring-gray-200 flex flex-col md:flex-row items-center p-8 gap-8 group"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={cardVariants}
            custom={1}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_70%_30%,#a855f7_0%,transparent_65%)]" />
            <div className="flex flex-col flex-1 relative z-10">
              <span className="mb-2 inline-block text-[11px] tracking-wider font-semibold text-purple-700/80 bg-purple-50 px-2 py-1 rounded-full">
                24/7 SUPPORT
              </span>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 leading-snug">
                Call NigamAI Citizen Support
              </h3>
              <p className="text-gray-600 mt-4 text-sm md:text-base max-w-md">
                Get help on <strong>tax, water, licenses, grievances</strong> & more. Scan the QR or tap to connect with our AI‑powered helpline.
              </p>
              <div className="mt-6 flex items-center gap-5 flex-wrap">
                <div className="relative p-2 rounded-xl shadow-sm bg-white w-24 h-24 flex items-center justify-center ring-1 ring-gray-200">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-purple-500/0 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <img
                    src={Qrcode}
                    alt="Support QR Code"
                    className="w-full h-full object-contain select-none"
                    loading="lazy"
                  />
                </div>
                <motion.button
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-2 bg-purple-600 text-white text-sm font-semibold px-6 py-3 rounded-xl shadow hover:bg-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-purple-600 transition"
                >
                  Call Now <span className="text-xs">📞</span>
                </motion.button>
                <motion.button
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-2 bg-white text-purple-700 text-sm font-medium px-6 py-3 rounded-xl border border-purple-200 hover:bg-purple-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white transition"
                >
                  Chat Bot
                </motion.button>
              </div>
            </div>
            <div className="hidden md:flex justify-end relative z-10">
              <div className="w-36 h-36 md:w-44 md:h-44 rounded-2xl overflow-hidden ring-4 ring-purple-200 shadow-lg">
                <img
                  src={Phonephoto}
                  alt="Support phone mockup"
                  className="w-full h-full object-cover select-none"
                  loading="lazy"
                />
              </div>
            </div>
          </motion.article>
        </div>
      </div>
      {/* Scroll progress indicator */}
      <div
        ref={progressRef}
        aria-hidden="true"
        className="origin-left h-1 w-40 md:w-64 bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 rounded-full absolute -bottom-1 left-1/2 -translate-x-1/2"
      />
    </section>
  );
}
