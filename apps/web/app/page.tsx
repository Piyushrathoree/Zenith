import React from "react";

import HeroSection from "./components/custom/HeroSection";
import HorizontalScroller from "./components/custom/HorizontalScroller";

const page = () => {
  return (
    <div className="relative ">
     <HeroSection />
     <HorizontalScroller />
    </div>
  );
};

export default page;
