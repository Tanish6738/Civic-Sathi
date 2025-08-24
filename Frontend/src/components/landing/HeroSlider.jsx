import React from "react";
import { motion } from "framer-motion";

// Elegant hero section with animated brand text and simple tagline/content.
// Removed previous image slider for a cleaner, faster landing experience.

const letters = "Nigam AI".split("");

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.09, delayChildren: 0.2 }
  }
};

const letterVariants = {
  hidden: { y: 40, opacity: 0, filter: "blur(4px)" },
  visible: {
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 420, damping: 28 }
  }
};

const taglineVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { delay: 1, duration: 0.8, ease: "easeOut" } }
};

const paragraphVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { delay: 1.15, duration: 0.9, ease: "easeOut" } }
};

const ctaVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { delay: 1.35, duration: 0.5, ease: "easeOut" } }
};

export default function HeroSlider() {
  return (
    <section className="relative w-full h-[300px] sm:h-[380px] md:h-[460px] lg:h-[78vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-800 via-indigo-800 to-slate-900 text-white">
        {/* Soft radial glow */}
        <video src="./src/assets/hero.mp4" autoPlay loop muted className="absolute inset-0 w-full h-full object-cover" />
      </section>
    );
  }
