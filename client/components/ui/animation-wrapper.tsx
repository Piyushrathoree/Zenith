"use client";
import React from "react";
import { motion } from "framer-motion";

interface AnimationWrapperProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}

export const AnimationWrapper = ({
  children,
  className,
  delay = 0,
  duration = 0.5,
}: AnimationWrapperProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
