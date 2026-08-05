import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sun, Moon, User, FolderOpen, Mail } from "lucide-react";
import { motion } from "framer-motion";

interface NavbarProps {
  activeSection: string;
  onNavigate: (id: string) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeSection, onNavigate, theme, onToggleTheme }) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { id: "about", label: "About", icon: User, to: null },
    { id: "projects", label: "Projects", icon: FolderOpen, to: "/projects" },
    { id: "contact", label: "Contact", icon: Mail, to: null },
  ];

  return (
    <>
      {/* ── Desktop Navbar (hidden on mobile) ── */}
      <div className={`hidden sm:block fixed left-1/2 -translate-x-1/2 z-50 w-full max-w-fit px-4 transition-all duration-500 ${isScrolled ? "top-3" : "top-5"}`}>
        <div className={`flex items-center gap-8 sm:gap-10 rounded-full px-7 py-2.5 backdrop-blur-2xl border shadow-lg transition-all duration-500 ${
          isScrolled
            ? "bg-white/80 dark:bg-zinc-950/85 border-zinc-200/90 dark:border-zinc-800/90 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
            : "bg-white/60 dark:bg-zinc-950/60 border-zinc-200/60 dark:border-zinc-800/60 shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
        }`}>

          {/* Brand Avatar */}
          <Link
            to="/"
            onClick={() => {
              if (window.location.pathname === "/") {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className="flex items-center gap-2.5 cursor-pointer group outline-none"
          >
            <img
              src="/profile pic.png"
              className="w-7 h-7 rounded-full object-cover shrink-0 border border-zinc-300 dark:border-zinc-700 group-hover:rotate-12 group-hover:scale-110 transition-all duration-300"
              alt="Sudhakar Reddy Katam"
              loading="lazy"
            />
            <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 tracking-wider">Sudhakar</span>
          </Link>

          <span className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />

          {/* Links */}
          <nav className="flex items-center gap-7 sm:gap-9 text-[11px] font-bold tracking-widest text-zinc-500 dark:text-zinc-400" aria-label="Main navigation">
            {navItems.map(item =>
              item.to ? (
                <Link
                  key={item.id}
                  to={item.to}
                  className={`transition-colors relative py-0.5 outline-none ${activeSection === item.id
                    ? "text-zinc-900 dark:text-white"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                  aria-current={activeSection === item.id ? "page" : undefined}
                >
                  {item.label}
                  {activeSection === item.id && (
                    <motion.span
                      layoutId="navbar-active-indicator"
                      className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              ) : (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`transition-colors relative py-0.5 outline-none ${activeSection === item.id
                    ? "text-zinc-900 dark:text-white"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                  aria-current={activeSection === item.id ? "page" : undefined}
                >
                  {item.label}
                  {activeSection === item.id && (
                    <motion.span
                      layoutId="navbar-active-indicator"
                      className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              )
            )}
          </nav>

          <span className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />

          {/* Theme Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleTheme}
              className="flex items-center justify-center w-7 h-7 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all outline-none"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Bottom Navbar — with theme toggle ── */}
      <div className="sm:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-1 rounded-full px-3 py-2 backdrop-blur-2xl bg-white/75 dark:bg-zinc-900/80 border border-zinc-200/60 dark:border-zinc-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
          {navItems.map(item =>
            item.to ? (
              <Link
                key={item.id}
                to={item.to}
                className={`relative flex items-center justify-center w-11 h-11 rounded-full transition-all duration-300 outline-none ${
                  activeSection === item.id
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-black shadow-md"
                    : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
                aria-label={item.label}
                aria-current={activeSection === item.id ? "page" : undefined}
              >
                <item.icon size={18} strokeWidth={activeSection === item.id ? 2.5 : 1.8} />
              </Link>
            ) : (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`relative flex items-center justify-center w-11 h-11 rounded-full transition-all duration-300 outline-none ${
                  activeSection === item.id
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-black shadow-md"
                    : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
                aria-label={item.label}
                aria-current={activeSection === item.id ? "page" : undefined}
              >
                <item.icon size={18} strokeWidth={activeSection === item.id ? 2.5 : 1.8} />
              </button>
            )
          )}

          {/* Mobile Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="relative flex items-center justify-center w-11 h-11 rounded-full text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-300 outline-none"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
          </button>
        </div>
      </div>
    </>
  );
};
