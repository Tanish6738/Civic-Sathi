import React, { useEffect } from "react";
import {
  Navbar,
  HeroSlider,
  CardSlider,
  CategoriesGrid,
  ServicesList,
  StepsTimeline,
  PartnerSupport,
  Footer,
} from "../landing";
import { useUser } from "@clerk/clerk-react";

/**
 * Landing page composed of marketing / introductory sections.
 * Uses semantic <main> container instead of a generic <div> for accessibility.
 */
export default function Landing() {
  const { user } = useUser();
  console.log(user)
  useEffect(() => {
    const handleServices = () => {
      // Placeholder: could trigger analytics or chain next section animations
      // console.log('Services section fully revealed');
    };
    const handleSteps = () => {
      // console.log('Steps timeline fully revealed');
    };
    window.addEventListener('services:revealComplete', handleServices);
    window.addEventListener('steps:revealComplete', handleSteps);
    return () => {
      window.removeEventListener('services:revealComplete', handleServices);
      window.removeEventListener('steps:revealComplete', handleSteps);
    };
  }, []);
  return (
    <main className="w-full flex flex-col min-h-screen">
      {/* Primary navigation */}
      <Navbar />
      {/* Hero section */}
      <HeroSlider />
      {/* Feature / info cards */}
      <CardSlider />
      {/* Categories overview */}
      <CategoriesGrid />
      {/* Services list */}
      <ServicesList />
      {/* Process timeline */}
      <StepsTimeline />
      {/* Partner & support info */}
      <PartnerSupport />
      {/* Global footer */}
      <Footer />
    </main>
  );
}
