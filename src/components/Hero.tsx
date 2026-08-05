import React, { useState, useEffect } from "react";
import { motion, Variants } from "framer-motion";

interface HeroProps {
  name: string;
  bio: string;
  bannerImage?: string;
  contact: {
    email: string;
    github?: string;
    linkedin?: string;
    twitter?: string;
    resume?: string;
  };
}

export const Hero: React.FC<HeroProps> = ({ name, bio, bannerImage, contact }) => {
  const [timeStr, setTimeStr] = useState("");

  // Live IST Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      setTimeStr(formatter.format(now));
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.15,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 18 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  const bannerSrc = bannerImage || "/banner image.png";

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 sm:space-y-8 pt-4 sm:pt-16"
    >

      {/* ── Banner on top of hero — separate element with gradient fade ── */}
      <motion.div
        variants={itemVariants}
        className="relative w-full h-32 sm:h-48 rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg group"
      >
        {/* Banner background image */}
        <img
          src={bannerSrc}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1200&auto=format&fit=crop";
          }}
          alt="Hero Banner"
          className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-700"
        />

        {/* Gradient overlays for smooth blending into page */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#fafafa] dark:to-[#0a0a0c]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#fafafa]/40 dark:from-[#0a0a0c]/40 via-transparent to-[#fafafa]/40 dark:to-[#0a0a0c]/40" />
        {/* Subtle color tint */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.2) 0%, transparent 50%),
                              radial-gradient(circle at 80% 20%, rgba(168, 85, 247, 0.15) 0%, transparent 40%)`,
          }}
        />
        {/* Noise texture */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")` }} />
      </motion.div>

      {/* ── Profile Section ── */}
      <motion.div variants={itemVariants} className="space-y-4 sm:space-y-6 py-1 sm:py-2">

        {/* Profile Avatar & Name */}
        <div className="flex flex-row items-center sm:items-start gap-4 sm:gap-8">
          {/* Profile Image with glow ring */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="relative shrink-0"
          >
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-zinc-200 dark:border-zinc-700 shadow-xl ring-2 sm:ring-4 ring-zinc-100 dark:ring-zinc-900/80">
              <img
                src="/profile pic.png"
                className="w-full h-full object-cover bg-zinc-100 dark:bg-zinc-900"
                alt={name}
              />
            </div>
            {/* Online indicator */}
            <span className="absolute bottom-0.5 right-0.5 w-3 h-3 sm:w-4 sm:h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-[#0a0a0c] shadow-sm" />
          </motion.div>

          <div className="space-y-2 sm:space-y-3 text-left flex-1 min-w-0">
            {/* Full Name - Two Line Layout */}
            <div>
              <h1 className="text-2xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-[1.1]">
                Sudhakar
              </h1>
              <h1 className="text-2xl sm:text-5xl font-extrabold tracking-tight text-zinc-600 dark:text-zinc-400 leading-[1.1]">
                Reddy Katam
              </h1>
            </div>

            {/* Subtitle with badges */}
            <div className="flex flex-wrap items-center gap-2 justify-start">
              <p className="text-sm sm:text-lg font-medium text-zinc-600 dark:text-zinc-400">
                Engineer with many interests, always curious to explore new technologies
              </p>
            </div>

            {/* Plain text update date and live IST clock */}
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium pt-1">
              Updated Aug 06, 2026 · {timeStr || "8:44 AM"} in India
            </p>
          </div>
        </div>

        {/* Bio Text */}
        <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base leading-relaxed max-w-3xl">
          {bio}
        </p>

        {/* ── Social Links (Prose Style) ── */}
        <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base leading-relaxed pt-1">
          You can find me on{" "}
          {contact.twitter && (
            <a href={contact.twitter} target="_blank" rel="noreferrer" className="font-semibold text-zinc-900 dark:text-white underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-[3px] hover:decoration-indigo-500 dark:hover:decoration-indigo-400 transition-colors">X</a>
          )}
          {contact.github && (
            <>{", "}<a href={contact.github} target="_blank" rel="noreferrer" className="font-semibold text-zinc-900 dark:text-white underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-[3px] hover:decoration-indigo-500 dark:hover:decoration-indigo-400 transition-colors">GitHub</a></>
          )}
          {contact.linkedin && (
            <>{", "}<a href={contact.linkedin} target="_blank" rel="noreferrer" className="font-semibold text-zinc-900 dark:text-white underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-[3px] hover:decoration-indigo-500 dark:hover:decoration-indigo-400 transition-colors">LinkedIn</a></>
          )}
          {", or reach me via "}
          <a href={`mailto:${contact.email}`} className="font-semibold text-zinc-900 dark:text-white underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-[3px] hover:decoration-indigo-500 dark:hover:decoration-indigo-400 transition-colors">email</a>
          .
        </p>

      </motion.div>

      {/* ── Status Ticker Bar ── */}
      <motion.div variants={itemVariants} className="pt-1">
        <div className="relative flex flex-wrap items-center justify-between gap-y-2 gap-x-4 py-3.5 border-t border-b border-zinc-200 dark:border-zinc-800/80 font-mono text-xs text-zinc-500 dark:text-zinc-400">
          {/* Subtle gradient overlay on borders */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-bold text-zinc-900 dark:text-white tracking-wider">Open to Freelance Opportunities</span>
          </div>

          <span className="hidden sm:inline text-zinc-300 dark:text-zinc-800">•</span>

          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400 dark:text-zinc-500 font-medium">BUILDING:</span>{" "}
            <span className="text-zinc-800 dark:text-zinc-200 font-semibold">AI Apps & Mobile Tools</span>
          </div>

          <span className="hidden sm:inline text-zinc-300 dark:text-zinc-800">•</span>

          <div>
            <span className="text-zinc-400 dark:text-zinc-500 font-medium">EXPLORING:</span>{" "}
            <span className="text-zinc-800 dark:text-zinc-200 font-semibold">Agentic AI • RAG • MCP</span>
          </div>
        </div>
      </motion.div>

    </motion.div>
  );
};
