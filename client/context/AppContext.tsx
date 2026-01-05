"use client";

import { useStore } from "@/store/useStore";
import { ReactNode } from "react";

// Shim export to replace the old Context hook with Zustand store selector
export const useApp = useStore;

// Dummy Provider to prevent breaking the component tree
export const AppProvider = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};
