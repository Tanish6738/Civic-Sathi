import React, { useEffect, useState } from "react";
import { cardData } from "./landingData.jsx";

export default function CardSlider() {
  const getVisible = () => {
    if (typeof window !== "undefined") {
      const w = window.innerWidth;
      if (w >= 1280) return 5;
      if (w >= 1024) return 4;
      if (w >= 768) return 3;
      if (w >= 480) return 2;
    }
    return 1;
  };
  const [visible, setVisible] = useState(getVisible());
  const [current, setCurrent] = useState(0);
  const total = Math.ceil(cardData.length / visible);
  useEffect(() => {
    const onResize = () => setVisible(getVisible());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  useEffect(() => setCurrent((p) => (p >= total ? 0 : p)), [total]);
  const prev = () => setCurrent((p) => (p === 0 ? total - 1 : p - 1));
  const next = () => setCurrent((p) => (p === total - 1 ? 0 : p + 1));

  return (
    <div className="w-full flex flex-col items-center py-10 bg-gray-50">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">New in NigamAI</h2>
      <div className="relative w-11/12 overflow-hidden">
        <div
          className="flex gap-x-5 transition-transform duration-700 ease-in-out"
          style={{
            width: `${(cardData.length * 100) / visible}%`,
            transform: `translateX(-${current * (visible / cardData.length) * 100}%)`,
          }}
        >
          {cardData.map((c, i) => (
            <div
              key={i}
              className="flex-shrink-0"
              style={{ flex: `0 0 ${100 / cardData.length}%` }}
            >
              <div className="bg-white border border-gray-200 rounded-xl p-5 h-40 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 text-lg shadow-sm">
                    {c.icon}
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-medium text-sm md:text-base text-gray-900 line-clamp-2">
                      {c.title}
                    </h3>
                    <p className="text-xs text-gray-600 mt-1">{c.subtitle}</p>
                  </div>
                </div>
                <button className="bg-blue-600 text-white px-3 py-1 rounded-md text-xs font-medium w-fit hover:bg-blue-700">
                  Available Now
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          aria-label="Previous services"
          onClick={prev}
          className="absolute top-1/2 left-0 -translate-y-1/2 bg-gray-700/60 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-800"
        >
          ❮
        </button>
        <button
          aria-label="Next services"
          onClick={next}
          className="absolute top-1/2 right-0 -translate-y-1/2 bg-gray-700/60 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-800"
        >
          ❯
        </button>
      </div>
      <div className="flex space-x-2 mt-5">
        {[...Array(total)].map((_, i) => (
          <button
            key={i}
            aria-label={`Go to card set ${i + 1}`}
            onClick={() => setCurrent(i)}
            className={`h-3 w-3 rounded-full ${current === i ? "bg-blue-600" : "bg-gray-300"}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-3 mt-6">
        {[
          "Grievances",
          "Bill Tracking",
          "Citizen Charter",
          "Tree Cutting NOC",
          "Business Licenses",
          "Environmental Approvals",
        ].map((tag, i) => (
          <span
            key={i}
            className="px-4 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium cursor-pointer hover:bg-blue-100"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
