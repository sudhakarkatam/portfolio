import React, { useState, useEffect } from "react";
import { useTheme } from "@/hooks/useTheme";
import { Navbar } from "@/components/Navbar";

interface PageLayoutProps {
  children: React.ReactNode;
  activeSection: string;
  onNavigate: (id: string) => void;
}

export const PageLayout: React.FC<PageLayoutProps> = ({ children, activeSection, onNavigate }) => {
  const { theme, toggleTheme } = useTheme();

  // Cursor Spotlight Effect (Desktop Mouse Tracking)
  const [mousePosition, setMousePosition] = useState({ x: -100, y: -100 });

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", updateMousePosition);
    return () => window.removeEventListener("mousemove", updateMousePosition);
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0c] text-zinc-900 dark:text-[#f4f4f5] font-sans selection:bg-indigo-500/15 dark:selection:bg-indigo-500/20 selection:text-zinc-900 dark:selection:text-white relative transition-colors duration-300 overflow-x-hidden">

      {/* ── Cursor Spotlight (Desktop Only, Neutral Monochrome) ── */}
      <div
        className="hidden md:block fixed inset-0 pointer-events-none z-30 transition-opacity duration-300"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, ${
            theme === "dark"
              ? "rgba(255, 255, 255, 0.03)"
              : "rgba(0, 0, 0, 0.02)"
          }, transparent 80%)`,
        }}
      />


      {/* Subtle Background Grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-40 dark:opacity-30"
        style={{
          backgroundImage:
            theme === "dark"
              ? `
              linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
            `
              : `
              linear-gradient(to right, rgba(0, 0, 0, 0.03) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(0, 0, 0, 0.03) 1px, transparent 1px)
            `,
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(circle at center, black 40%, transparent 95%)",
          WebkitMaskImage: "radial-gradient(circle at center, black 40%, transparent 95%)",
        }}
      />

      {/* Navigation */}
      <Navbar
        activeSection={activeSection}
        onNavigate={onNavigate}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content */}
      {children}
    </div>
  );
};

export default PageLayout;
