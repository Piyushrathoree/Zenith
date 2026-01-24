"use client";
import React, { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

export const TimelineBeam = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Smooth out the scroll progress
  const scaleY = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <div ref={ref} className={`relative w-full max-w-7xl mx-auto ${className}`}>
      <div className="absolute left-0 top-24 bottom-0 hidden md:flex flex-col items-center w-8">
        {/* Main Beam Track */}
        <div className="h-full w-[1.5px] bg-neutral-200 rounded-full overflow-hidden">
          {/* Fills with orange as you scroll */}
          <motion.div
            className="w-full bg-[#F97E2C] origin-top"
            style={{
              height: "100%",
              scaleY: scaleY,
            }}
          />
        </div>
      </div>

      {/* Content wrapper - add left padding on desktop for the beam */}
      <div className="md:pl-12">{children}</div>
    </div>
  );
};
