/*src\contexts\SidebarContext.tsx */
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
} from "react";
import { usePathname } from "next/navigation";

interface SidebarContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  // Close the mobile drawer automatically whenever the route changes.
  // This is React's documented "adjust state while rendering when a value
  // changes" pattern: the update is guarded by the comparison, so it runs once
  // per navigation, closes the drawer in the same render pass as the new
  // route, and avoids calling setState inside an effect
  // (react-hooks/set-state-in-effect).
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setIsOpen(false);
  }

  return (
    <SidebarContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}
