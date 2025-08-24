import React from "react";
import { FaMicrophone, FaFacebook, FaTwitter, FaLinkedin, FaYoutube, FaHome, FaBuilding, FaPhoneAlt } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="bg-[#0c1a26] text-gray-300 py-12 text-sm">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center space-x-3 mb-4">
            <FaMicrophone className="text-purple-400 text-3xl" />
            <h1 className="text-white font-bold text-lg">NigamAI</h1>
          </div>
          <p className="mb-4 text-gray-400 text-sm leading-relaxed">
            NigamAI is a <strong>voice-based AI assistant</strong> built to simplify <strong>municipal services</strong>. From paying property tax to applying for certificates, NigamAI empowers citizens with <strong> natural language voice commands</strong>.
          </p>
          <p className="font-semibold mb-2">FOLLOW US</p>
          <div className="flex space-x-3 text-xl">
            <a href="#" className="hover:text-blue-500" aria-label="Facebook"><FaFacebook /></a>
            <a href="#" className="hover:text-sky-400" aria-label="Twitter"><FaTwitter /></a>
            <a href="#" className="hover:text-blue-400" aria-label="LinkedIn"><FaLinkedin /></a>
            <a href="#" className="hover:text-red-500" aria-label="YouTube"><FaYoutube /></a>
          </div>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><FaHome className="text-purple-400" /> Quick Links</h3>
          <ul className="space-y-2">
            {[
              ["🏠 Home"],
              ["ℹ About NigamAI"],
              ["❓ FAQs"],
              ["📊 Statistics"],
              ["📰 Resources"],
              ["📢 Announcements"],
            ].map(([t], i) => (
              <li key={i}><a href="#" className="hover:text-white">{t}</a></li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><FaBuilding className="text-purple-400" /> Services</h3>
          <ul className="space-y-2">
            {[
              "📄 Birth/Death/Marriage Certificates",
              "🏠 Property Tax",
              "💧 Water & Sewerage",
              "🗑 Solid Waste Management",
              "📜 Licenses & Approvals",
              "🙋 Grievances & Support",
            ].map((t, i) => (
              <li key={i}><a href="#" className="hover:text-white">{t}</a></li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><FaPhoneAlt className="text-purple-400" /> Contact Us</h3>
          <p className="text-gray-400 mb-3">NigamAI Helpline <br />Available 24/7 for municipal services <br /></p>
          <p className="uppercase text-xs font-semibold text-gray-300 mb-2">DOWNLOAD NIGAMAI APP</p>
          <div className="flex space-x-3 mb-3">
            <img src="https://www.digilocker.gov.in/images/googleplay.png" alt="Google Play" className="w-28" />
            <img src="https://www.digilocker.gov.in/images/appstore.png" alt="App Store" className="w-28" />
          </div>
          <p className="text-xs text-gray-500">Last Updated: Aug 24, 2025 <br />Citizens Served: 1,20,45,220 <br />Since Launch: Jan 2024</p>
        </div>
      </div>
      <div className="border-t border-gray-700 mt-8 pt-4 text-gray-400 text-xs text-center px-4">
        <p>Copyright © 2025, NigamAI | Voice AI for Smart Municipal Services</p>
        <p className="mt-1">Privacy Policy | Terms of Use | Contact</p>
      </div>
    </footer>
  );
}
