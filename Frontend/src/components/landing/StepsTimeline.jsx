import React from "react";
import { steps, stepDescriptions } from "./landingData.jsx";

export default function StepsTimeline() {
  return (
    <section aria-labelledby="steps-heading" className="w-full bg-[#f5f3ff] py-16 sm:py-20 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-gradient-to-br from-purple-300/40 to-blue-300/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-120px] right-[-80px] w-80 h-80 rounded-full bg-gradient-to-tr from-yellow-200/40 to-pink-200/30 blur-3xl" />
      <div className="relative max-w-6xl mx-auto px-5 sm:px-6">
        <header className="text-center mb-14">
          <h2 id="steps-heading" className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 tracking-tight leading-tight">
            Getting started is <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">simple</span>
          </h2>
          <p className="mt-4 text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
            Begin using <span className="font-semibold text-purple-700">NigamAI</span> in just a few guided steps — optimized for mobile, tablet and desktop.
          </p>
        </header>
        <ol role="list" className="relative flex flex-col gap-12 sm:gap-10 sm:flex-row sm:items-start md:gap-12">
          <div aria-hidden="true" className="hidden sm:block absolute top-10 left-0 right-0 h-px bg-gradient-to-r from-purple-200 via-blue-200 to-purple-200" />
          {steps.map((step, index) => (
            <li key={index} className="relative group flex sm:flex-1">
              {index !== steps.length - 1 && <span aria-hidden="true" className="sm:hidden absolute left-7 top-14 bottom-[-24px] w-px bg-gradient-to-b from-purple-200 via-blue-200 to-purple-200" />}
              <div className="flex flex-col sm:items-center sm:text-center text-left w-full">
                <div className="relative w-14 h-14 mx-0 sm:mx-auto">
                  <span className="absolute inset-0 rounded-2xl bg-white shadow-lg ring-1 ring-purple-100 flex items-center justify-center text-3xl transition-all duration-300 group-hover:shadow-purple-200/70 group-hover:scale-105">{step.icon}</span>
                  <span className="absolute -top-2 -right-2 bg-gradient-to-br from-purple-600 to-blue-600 text-white text-[10px] font-semibold px-2 py-[2px] rounded-full shadow-sm">{index + 1}</span>
                </div>
                <h3 className="mt-5 font-semibold text-gray-800 text-sm sm:text-base md:text-lg tracking-tight group-hover:text-purple-700 transition-colors">{step.label}</h3>
                <p className="mt-2 text-xs sm:text-[13px] md:text-sm text-gray-500 max-w-[15rem] sm:max-w-[13rem] md:max-w-xs leading-relaxed">{stepDescriptions[index]}</p>
                <div className="mt-4 flex items-center gap-3">
                  <button className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-[#f5f3ff]">Start <span className="text-xs">→</span></button>
                  {index === 0 && <button className="hidden sm:inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-[#f5f3ff]">Why register?</button>}
                </div>
              </div>
              {index < steps.length - 1 && <span className="hidden sm:flex absolute top-8 right-[-18px] text-gray-300 text-2xl group-hover:text-gray-400 transition-colors">➝</span>}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
