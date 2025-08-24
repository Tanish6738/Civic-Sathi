import React, { useEffect, useState } from "react";
import { images } from "./landingData.jsx";

export default function HeroSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setCurrentIndex(p => (p === images.length - 1 ? 0 : p + 1)), 4000);
    return () => clearInterval(timer);
  }, []);
  const prev = () => setCurrentIndex(p => (p === 0 ? images.length - 1 : p - 1));
  const next = () => setCurrentIndex(p => (p === images.length - 1 ? 0 : p + 1));

  return (
    <div className="relative w-full h-[260px] sm:h-[340px] md:h-[430px] lg:h-[500px] overflow-hidden z-0">
      <img src={images[currentIndex]} alt={`Hero slide ${currentIndex + 1}`} className="w-full h-full object-cover md:object-contain transition-all duration-700" style={{ backgroundColor: "#3F46F9" }} loading="lazy" />
      <button onClick={prev} aria-label="Previous Slide" className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/30 backdrop-blur-md text-white p-3 sm:p-4 rounded-full shadow-md hover:bg-white/50 hover:scale-110 transform transition duration-300 z-10">
        <span className="text-2xl font-bold">❮</span>
      </button>
      <button onClick={next} aria-label="Next Slide" className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/30 backdrop-blur-md text-white p-3 sm:p-4 rounded-full shadow-md hover:bg-white/50 hover:scale-110 transform transition duration-300 z-10">
        <span className="text-2xl font-bold">❯</span>
      </button>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-3 z-10">
        {images.map((_, i) => (
          <button key={i} aria-label={`Go to slide ${i + 1}`} onClick={() => setCurrentIndex(i)} className={`h-3 w-3 rounded-full transition-all ${i === currentIndex ? "bg-white scale-125 shadow-md" : "bg-gray-400"}`} />
        ))}
      </div>
    </div>
  );
}
