import React from "react";
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

/**
 * Landing page composed of marketing / introductory sections.
 * Uses semantic <main> container instead of a generic <div> for accessibility.
 */
export default function Landing() {
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
