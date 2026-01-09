"use client";

import { motion, useAnimation, useInView } from "framer-motion";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: React.ReactNode;
  width?: "fit-content" | "100%";
  className?: string;
  delay?: number;
  duration?: number;
}

export const Reveal = ({
  children,
  width = "fit-content",
  className,
  delay = 0.25,
  duration = 0.5,
}: RevealProps) => {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 75 },
        visible: { opacity: 1, y: 0 },
      }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      transition={{ duration, delay }}
      className={cn(width === "100%" ? "w-full" : "w-fit", className)}
    >
      {children}
    </motion.div>
  );
};
