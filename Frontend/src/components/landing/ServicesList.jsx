import React from "react";
import { services } from "./landingData.jsx";

export default function ServicesList() {
  return (
    <div className="px-6 md:px-16 py-12">
      <div className="flex flex-wrap gap-6 justify-center">
        {services.map((s, i) => (
          <div key={i} className="flex items-center px-5 py-4 bg-white border rounded-xl shadow-sm cursor-pointer transition-transform transform hover:scale-[1.03] hover:shadow-lg hover:border-purple-300 duration-300 ease-in-out">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 text-xl shadow-sm">{s.icon}</div>
            <div className="ml-4">
              <h3 className="font-semibold text-gray-900 text-sm md:text-base">{s.name}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
