"use client";

import { motion } from "framer-motion";

interface AuthCardEntranceProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthCardEntrance({ children, className }: AuthCardEntranceProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ type: "spring", stiffness: 360, damping: 32, mass: 0.85 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
