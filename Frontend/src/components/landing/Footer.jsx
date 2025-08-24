import React, { useEffect, useRef } from "react";
import { FaMicrophone, FaFacebook, FaTwitter, FaLinkedin, FaYoutube, FaHome, FaBuilding, FaPhoneAlt } from "react-icons/fa";
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

const linkCols = [
  {
    title: 'Quick Links',
    icon: <FaHome className="text-blue-400" />,
    items: ['Home','About NigamAI','FAQs','Statistics','Resources','Announcements']
  },
  {
    title: 'Services',
    icon: <FaBuilding className="text-blue-400" />,
    items: ['Birth / Death / Marriage','Property Tax','Water & Sewerage','Solid Waste Management','Licenses & Approvals','Grievances & Support']
  }
];

export default function Footer() {
  const footerRef = useRef(null);
  const colRefs = useRef([]);
  useEffect(() => {
    const el = footerRef.current; if (!el) return;
    const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cols = colRefs.current.filter(Boolean);
    if (prefersReduce) return; // no fancy animation
    const ctx = gsap.context(() => {
      gsap.from(cols, { opacity: 0, y: 40, stagger: 0.15, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
    });
    return () => ctx.revert();
  }, []);

  const year = new Date().getFullYear();

  return (
    <footer ref={footerRef} className="relative overflow-hidden bg-[#0b1722] text-gray-300 pt-16 pb-10 text-sm">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.15),transparent_60%)]" />
      <div className="max-w-7xl mx-auto px-5 md:px-8 grid grid-cols-1 md:grid-cols-12 gap-12 relative z-10">
        <div ref={el=>colRefs.current[0]=el} className="md:col-span-4">
          <div className="flex items-center gap-3 mb-5">
            <FaMicrophone className="text-blue-400 text-3xl" />
            <h1 className="text-white font-extrabold text-xl tracking-tight">NigamAI</h1>
          </div>
          <p className="mb-5 text-gray-400 leading-relaxed text-[13px] md:text-sm max-w-sm">
            Voice-first AI assistant simplifying municipal services: file applications, track requests, make payments—using natural language.
          </p>
          <div>
            <p className="font-semibold mb-3 tracking-wide text-gray-200 text-xs">Follow</p>
            <div className="flex items-center gap-3 text-lg">
              {[
                { Icon: FaFacebook, label: 'Facebook', color: 'hover:text-blue-500' },
                { Icon: FaTwitter, label: 'Twitter / X', color: 'hover:text-sky-400' },
                { Icon: FaLinkedin, label: 'LinkedIn', color: 'hover:text-blue-400' },
                { Icon: FaYoutube, label: 'YouTube', color: 'hover:text-red-500' }
              ].map(({Icon,label,color},i)=>(
                <a key={label+i} href="#" aria-label={label} className={`transition-colors ${color} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 rounded`}> <Icon /> </a>
              ))}
            </div>
          </div>
        </div>
        {linkCols.map((col,i)=>(
          <div ref={el=>colRefs.current[i+1]=el} key={col.title} className="md:col-span-2">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2 text-sm tracking-wide">{col.icon} <span>{col.title}</span></h3>
            <ul className="space-y-2 text-[13px]">
              {col.items.map(item => (
                <li key={item}><a href="#" className="group inline-flex items-center gap-1 hover:text-white transition-colors"> <span className="h-1 w-1 rounded-full bg-gray-500 group-hover:bg-blue-500 transition-all" /> {item}</a></li>
              ))}
            </ul>
          </div>
        ))}
        <div ref={el=>colRefs.current[linkCols.length+1]=el} className="md:col-span-4">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2 text-sm tracking-wide"><FaPhoneAlt className="text-blue-400" /> Contact</h3>
          <address className="not-italic text-gray-400 text-[13px] leading-relaxed mb-4">
            NigamAI Helpline<br />24/7 Assistance for municipal services
          </address>
          <p className="uppercase text-xs font-semibold text-gray-300 mb-3">Download App</p>
          <div className="flex gap-3 mb-4">
            <a href="#" aria-label="Get it on Google Play" className="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 rounded"><img src="https://www.digilocker.gov.in/images/googleplay.png" alt="Google Play" className="w-32" loading="lazy" /></a>
            <a href="#" aria-label="Download on App Store" className="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 rounded"><img src="https://www.digilocker.gov.in/images/appstore.png" alt="App Store" className="w-32" loading="lazy" /></a>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[11px] text-gray-500 max-w-xs">
            <div><dt className="font-medium text-gray-400">Updated</dt><dd>Aug 24, {year}</dd></div>
            <div><dt className="font-medium text-gray-400">Citizens</dt><dd>1,20,45,220</dd></div>
            <div><dt className="font-medium text-gray-400">Launch</dt><dd>Jan 2024</dd></div>
            <div><dt className="font-medium text-gray-400">Support</dt><dd>24/7</dd></div>
          </dl>
        </div>
      </div>
      <div className="relative z-10 mt-12 px-5">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-blue-600/40 to-transparent" />
        <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-gray-500">
          <p>&copy; {year} NigamAI. All rights reserved.</p>
          <nav className="flex items-center gap-5">
            {['Privacy','Terms','Contact'].map(item => (
              <a key={item} href="#" className="hover:text-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 rounded px-1">{item}</a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
