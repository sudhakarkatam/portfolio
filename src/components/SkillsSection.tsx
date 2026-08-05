import React, { useState } from "react";
import {
  FaReact, FaJava, FaGitAlt, FaDocker, FaPython, FaNodeJs, FaAws
} from "react-icons/fa6";
import { RiOpenaiFill } from "react-icons/ri";
import {
  SiTypescript, SiPostgresql, SiSupabase, SiFirebase,
  SiTailwindcss, SiNextdotjs, SiVercel, SiRedis,
  SiGooglegemini, SiAnthropic, SiLangchain, SiShadcnui
} from "react-icons/si";
import { Terminal, Bot, Network, Workflow, MessageSquareCode } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SkillItem {
  name: string;
  category: string;
  icon?: React.ReactNode;
}

interface SkillCategory {
  id: string;
  category: string;
  shortLabel: string;
  hoverColor: string;
  items: SkillItem[];
}

export const SkillsSection: React.FC = () => {
  const skillCategories: SkillCategory[] = [
    {
      id: "languages",
      category: "LANGUAGES",
      shortLabel: "Languages",
      hoverColor: "hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-600 dark:hover:text-blue-400",
      items: [
        { name: "TypeScript", category: "Languages", icon: <SiTypescript size={14} className="text-[#3178C6]" /> },
        { name: "Python", category: "Languages", icon: <FaPython size={14} className="text-[#3776AB]" /> },
        { name: "Java", category: "Languages", icon: <FaJava size={15} className="text-[#5382A1]" /> },
      ],
    },
    {
      id: "frameworks",
      category: "FRAMEWORKS & WEB",
      shortLabel: "Frameworks",
      hoverColor: "hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-600 dark:hover:text-emerald-400",
      items: [
        { name: "React", category: "Frameworks", icon: <FaReact size={14} className="text-[#61DAFB]" /> },
        { name: "Next.js", category: "Frameworks", icon: <SiNextdotjs size={14} className="text-zinc-900 dark:text-white" /> },
        { name: "Node.js", category: "Frameworks", icon: <FaNodeJs size={14} className="text-[#5FA04E]" /> },
        { name: "Tailwind CSS", category: "Frameworks", icon: <SiTailwindcss size={14} className="text-[#06B6D4]" /> },
        { name: "REST APIs", category: "Frameworks", icon: <Network size={14} className="text-emerald-500" /> },
        { name: "shadcn/ui", category: "Frameworks", icon: <SiShadcnui size={14} className="text-zinc-900 dark:text-white" /> },
      ],
    },
    {
      id: "ai",
      category: "AI & AGENTS",
      shortLabel: "AI",
      hoverColor: "hover:bg-purple-500/10 hover:border-purple-500/30 hover:text-purple-600 dark:hover:text-purple-400",
      items: [
        { name: "Agentic AI", category: "AI", icon: <Bot size={14} className="text-purple-500" /> },
        { name: "AI Agents", category: "AI", icon: <Workflow size={14} className="text-purple-400" /> },
        { name: "RAG", category: "AI", icon: <Terminal size={14} className="text-indigo-400" /> },
        { name: "MCP", category: "AI", icon: <Network size={14} className="text-cyan-400" /> },
        { name: "LangChain", category: "AI", icon: <SiLangchain size={14} className="text-[#1C3C3C] dark:text-[#2E6B6B]" /> },
        { name: "LangGraph", category: "AI", icon: <Workflow size={14} className="text-[#1C3C3C] dark:text-[#2E6B6B]" /> },
        { name: "OpenAI", category: "AI", icon: <RiOpenaiFill size={14} className="text-zinc-900 dark:text-white" /> },
        { name: "Google Gemini", category: "AI", icon: <SiGooglegemini size={14} className="text-[#8E75FF]" /> },
        { name: "Claude", category: "AI", icon: <SiAnthropic size={14} className="text-[#D97757]" /> },
        { name: "Prompt Engineering", category: "AI", icon: <MessageSquareCode size={14} className="text-amber-500" /> },
      ],
    },
    {
      id: "databases",
      category: "DATABASES",
      shortLabel: "Databases",
      hoverColor: "hover:bg-orange-500/10 hover:border-orange-500/30 hover:text-orange-600 dark:hover:text-orange-400",
      items: [
        { name: "PostgreSQL", category: "Databases", icon: <SiPostgresql size={14} className="text-[#4169E1]" /> },
        { name: "Supabase", category: "Databases", icon: <SiSupabase size={14} className="text-[#3ECF8E]" /> },
        { name: "Redis", category: "Databases", icon: <SiRedis size={14} className="text-[#DC382D]" /> },
        { name: "Firebase", category: "Databases", icon: <SiFirebase size={14} className="text-[#FFCA28]" /> },
      ],
    },
    {
      id: "devops",
      category: "DEVOPS & TOOLS",
      shortLabel: "DevOps",
      hoverColor: "hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-600 dark:hover:text-amber-400",
      items: [
        { name: "Git", category: "Tools", icon: <FaGitAlt size={14} className="text-[#F05032]" /> },
        { name: "Vercel", category: "Tools", icon: <SiVercel size={14} className="text-zinc-900 dark:text-white" /> },
        { name: "Docker", category: "Tools", icon: <FaDocker size={14} className="text-[#2496ED]" /> },
        { name: "AWS", category: "Tools", icon: <FaAws size={14} className="text-[#FF9900]" /> },
      ],
    },
  ];

  // Tab state: "all" or category id
  const [activeTab, setActiveTab] = useState<string>("all");

  const allSkills = skillCategories.flatMap((cat) => cat.items);

  const displayedSkills = activeTab === "all"
    ? allSkills
    : skillCategories.find((cat) => cat.id === activeTab)?.items || [];

  const getHoverColor = (catId: string) => {
    return skillCategories.find((c) => c.id === catId)?.hoverColor || "hover:bg-zinc-200 dark:hover:bg-zinc-800";
  };

  return (
    <section id="skills" className="scroll-mt-24 space-y-6">

      {/* Section Header */}
      <div className="space-y-2">
        <div className="text-[10px] font-bold tracking-[0.25em] text-zinc-500 font-mono uppercase">
          TECHNOLOGIES
        </div>
        <div className="flex items-center gap-4">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Skills & Tech Stack
          </h2>
          <div className="h-px flex-1 bg-gradient-to-r from-zinc-300 dark:from-zinc-700 to-transparent" />
        </div>
      </div>

      {/* ── Compact Tabbed Skills Block ── */}
      <div className="bg-white dark:bg-[#070709] border border-zinc-200 dark:border-[#1e1e24] rounded-3xl overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-700/80 transition-all duration-300 shadow-sm">

        {/* Header Tabs — Desktop only */}
        <div className="hidden sm:flex items-center gap-0 border-b border-zinc-200 dark:border-zinc-800/80 px-2 sm:px-3 overflow-x-auto no-scrollbar">
          {/* ALL Tab */}
          <button
            onClick={() => setActiveTab("all")}
            className={`relative shrink-0 px-3.5 md:px-4 py-3 text-[10px] md:text-[11px] font-bold tracking-wider whitespace-nowrap transition-all outline-none ${
              activeTab === "all"
                ? "text-zinc-900 dark:text-white"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <span>ALL SKILLS ({allSkills.length})</span>

            {activeTab === "all" && (
              <motion.div
                layoutId="skills-tab-indicator"
                className="absolute bottom-0 left-2 right-2 h-0.5 bg-zinc-900 dark:bg-white rounded-full"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>

          {/* Category Tabs */}
          {skillCategories.map((group) => (
            <button
              key={group.id}
              onClick={() => setActiveTab(group.id)}
              className={`relative shrink-0 px-3.5 md:px-4 py-3 text-[10px] md:text-[11px] font-bold tracking-wider whitespace-nowrap transition-all outline-none ${
                activeTab === group.id
                  ? "text-zinc-900 dark:text-white"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <span>{group.category}</span>

              {activeTab === group.id && (
                <motion.div
                  layoutId="skills-tab-indicator"
                  className="absolute bottom-0 left-2 right-2 h-0.5 bg-zinc-900 dark:bg-white rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* ── Skill Badges Container ── */}
        <div className="p-4 sm:p-6">
          {/* Desktop View: renders activeTab skills */}
          <div className="hidden sm:block">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex flex-wrap gap-2.5"
              >
                {displayedSkills.map((skill) => (
                  <span
                    key={skill.name}
                    className={`group inline-flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 px-3.5 py-2 rounded-2xl grayscale hover:grayscale-0 hover:scale-[1.04] hover:shadow-md transition-all duration-200 cursor-default select-none ${getHoverColor(
                      skillCategories.find((cat) => cat.items.some((i) => i.name === skill.name))?.id || ""
                    )}`}
                  >
                    {skill.icon}
                    <span>{skill.name}</span>
                  </span>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Mobile View: categorized sections in a clean list layout */}
          <div className="sm:hidden space-y-4">
            {skillCategories.map((group) => (
              <div key={group.id} className="space-y-2 pb-3 border-b border-zinc-100 dark:border-zinc-800/50 last:border-0 last:pb-0">
                <div className="text-[10px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 font-mono uppercase">
                  // {group.category}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {group.items.map((skill) => (
                    <span
                      key={skill.name}
                      className={`group inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-100/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800/90 px-2.5 py-1.5 rounded-xl grayscale hover:grayscale-0 hover:scale-[1.04] transition-all duration-200 cursor-default select-none ${group.hoverColor}`}
                    >
                      {skill.icon}
                      <span>{skill.name}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </section>
  );
};

export default SkillsSection;
