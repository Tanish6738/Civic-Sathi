import React from "react";
import { categories } from "./landingData.jsx";

export default function CategoriesGrid() {
  return (
    <div className="bg-[#f3f0fc] flex flex-col items-center justify-center p-6">
      <div className="text-center mb-10">
        <p className="text-blue-700 font-semibold uppercase text-sm">Explore</p>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Fill Application Form</h2>
        <p className="text-sm text-gray-600 mt-2 max-w-2xl mx-auto">
          With <span className="font-semibold text-purple-700">NigamAI</span>, citizens can quickly fill and submit municipal application forms using both <strong> voice commands</strong> and traditional input. Select from a range of services below to get started.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl">
        {categories.map(cat => (
          <div key={cat.id} className="flex items-center gap-3 px-5 py-3 rounded-full border border-gray-200 bg-white hover:shadow-md hover:border-purple-300 transition duration-300 ease-in-out cursor-pointer">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${cat.bg}`}>{cat.icon}</div>
            <span className="font-medium text-gray-700 text-sm md:text-base">{cat.name}</span>
            <span className="ml-auto text-blue-600 font-semibold">&gt;</span>
          </div>
        ))}
      </div>
      <button className="mt-10 px-6 py-2 rounded-lg border border-blue-500 text-blue-600 font-medium hover:bg-blue-50 transition">More Services</button>
    </div>
  );
}
