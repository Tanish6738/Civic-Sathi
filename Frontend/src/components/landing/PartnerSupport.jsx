import React from "react";
import { Phonephoto, Qrcode } from "./landingData.jsx";

export default function PartnerSupport() {
  return (
    <div className="w-full bg-white py-20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-2 gap-10 px-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#f7a836] to-[#f6b857] shadow-md ring-1 ring-orange-200/40 flex flex-col sm:flex-row items-center p-8 gap-8 group transition-all duration-500 hover:shadow-xl">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity bg-[radial-gradient(circle_at_30%_20%,#ffffff_0%,transparent_70%)]" />
          <div className="flex flex-col flex-1 relative z-10">
            <span className="mb-2 inline-block text-[11px] tracking-wider font-semibold text-blue-900/80 bg-white/60 px-2 py-1 rounded-full">PARTNER PROGRAM</span>
            <h2 className="text-2xl md:text-3xl font-bold text-blue-900 leading-snug">Become a NigamAI Municipal Partner</h2>
            <p className="text-gray-900/90 mt-4 text-sm md:text-base max-w-md">Integrate <strong>voice-based civic services</strong> and accelerate digital governance with seamless citizen engagement.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button className="inline-flex items-center gap-2 bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-[#f7a836] transition">Get Integrated <span className="text-xs">→</span></button>
              <button className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm text-blue-900 text-sm font-medium px-5 py-2.5 rounded-lg shadow-sm hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-[#f7a836] transition">Learn More</button>
            </div>
          </div>
          <div className="flex justify-end relative z-10">
            <img src="https://img1.digitallocker.gov.in/digilocker-landing-page/assets/img/partner-img-1.png" alt="Partner illustration" className="w-40 md:w-48 drop-shadow-md" />
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 via-white to-gray-100 shadow-md ring-1 ring-gray-200 flex flex-col md:flex-row items-center p-8 gap-8 group transition-all duration-500 hover:shadow-xl">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[radial-gradient(circle_at_70%_30%,#a855f7_0%,transparent_65%)]" />
            <div className="flex flex-col flex-1 relative z-10">
              <span className="mb-2 inline-block text-[11px] tracking-wider font-semibold text-purple-700/80 bg-purple-50 px-2 py-1 rounded-full">24/7 SUPPORT</span>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-snug">Call NigamAI Citizen Support</h2>
              <p className="text-gray-600 mt-4 text-sm md:text-base max-w-md">Get help on <strong>tax, water, licenses, grievances</strong> & more. Scan the QR or tap to connect with our AI-powered helpline.</p>
              <div className="mt-6 flex items-center gap-5 flex-wrap">
                <div className="p-2 border rounded-xl shadow-sm bg-white w-24 h-24 flex items-center justify-center">
                  <img src={Qrcode} alt="QR Code" className="w-full h-full object-contain" />
                </div>
                <button className="inline-flex items-center gap-2 bg-purple-600 text-white text-sm font-semibold px-6 py-3 rounded-xl shadow hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-white transition">Call Now <span className="text-xs">📞</span></button>
                <button className="inline-flex items-center gap-2 bg-white text-purple-700 text-sm font-medium px-6 py-3 rounded-xl border border-purple-200 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-white transition">Chat Bot</button>
              </div>
            </div>
            <div className="hidden md:flex justify-end relative z-10">
              <div className="w-36 h-36 md:w-44 md:h-44 rounded-2xl overflow-hidden ring-4 ring-purple-200 shadow-lg">
                <img src={Phonephoto} alt="Support Phone" className="w-full h-full object-cover" />
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}
