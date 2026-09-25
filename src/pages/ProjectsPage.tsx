import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { portfolioData } from "@/data/portfolioData";
import { PageLayout } from "@/components/PageLayout";
import { FaGithub } from "react-icons/fa6";
import { ArrowUpRight, Terminal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { projects } = portfolioData;
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Extract categories dynamically
  const categories = useMemo(() => {
    const cats = new Set<string>();
    cats.add("All");
    projects.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [projects]);

  // Filter projects by category
  const filteredProjects = useMemo(() => {
    if (selectedCategory === "All") return projects;
    return projects.filter((p) => p.category === selectedCategory);
  }, [projects, selectedCategory]);

  const handleNavigateNavbar = (id: string) => {
    if (id === "contact") {
      navigate("/#contact");
    } else if (id === "resume") {
      const resumeUrl = portfolioData.contact.resume || "https://drive.google.com/file/d/1qNzycHvflNO2lLynBD3ao9udHO0bJIYJ/view?usp=sharing";
      window.open(resumeUrl, "_blank", "noopener,noreferrer");
    } else if (id === "about") {
      navigate("/");
    }
  };

  return (
    <PageLayout activeSection="projects" onNavigate={handleNavigateNavbar}>

      {/* Main Column aligned to 780px centered container */}
      <main className="relative z-10 mx-auto max-w-[780px] px-4 sm:px-6 pt-8 sm:pt-28 pb-28 sm:pb-24 space-y-10">

        {/* Minimalist Header */}
        <div className="space-y-3 pt-2">
          <div className="text-xs font-mono font-semibold tracking-wider text-zinc-500 dark:text-zinc-500 uppercase flex items-center gap-2">
            <Terminal size={13} className="text-emerald-500" />
            <span>INDEX OF PROJECTS</span>
          </div>

          <div className="flex items-center justify-between">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Projects & Code
            </h1>
            <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">
              {filteredProjects.length} items
            </span>
          </div>

          <p className="text-zinc-650 dark:text-zinc-400 text-sm sm:text-base leading-relaxed">
            Personal tools, web applications, and software experiments. Clean, functional, and built with purpose.
          </p>
        </div>

        {/* Minimalist Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono border-b border-zinc-200 dark:border-zinc-800/80 pb-5">
          <span className="text-zinc-400 mr-1">Filter:</span>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-md transition-all outline-none cursor-pointer ${
                selectedCategory === category
                  ? "bg-zinc-950 dark:bg-white text-white dark:text-black font-bold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Directory List */}
        <motion.div layout className="space-y-8">
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project) => {
              const liveUrl = project.link || project.liveUrl;

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  key={project.id}
                  className="group border-b border-zinc-200/60 dark:border-zinc-800/50 pb-8 space-y-3 transition-all duration-200 hover:bg-zinc-100/40 dark:hover:bg-[#0e0e12]/40 -mx-3 sm:-mx-4 px-3 sm:px-4 pt-3 rounded-xl"
                >
                  {/* Header Row: Title & Action Links */}
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {project.title}
                      </h2>
                      {project.category && (
                        <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 px-2 py-0.5 rounded uppercase">
                          {project.category}
                        </span>
                      )}
                    </div>

                    {/* Direct Action Links */}
                    <div className="flex items-center gap-3 text-xs font-mono shrink-0">
                      {project.github && (
                        <a
                          href={project.github}
                          target="_blank"
                          rel="noreferrer"
                          className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors p-1 rounded hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
                          title="GitHub Repository"
                          aria-label={`View ${project.title} on GitHub`}
                        >
                          <FaGithub size={16} />
                        </a>
                      )}
                      {liveUrl && (
                        <a
                          href={liveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold transition-colors p-1 rounded hover:bg-emerald-500/10 group/link"
                          title="Live Site"
                          aria-label={`Visit ${project.title} live site`}
                        >
                          <ArrowUpRight size={16} className="group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-zinc-650 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed max-w-2xl">
                    {project.description}
                  </p>

                  {/* Inline Monospace Tech Stack */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono text-zinc-500 dark:text-zinc-500 pt-1">
                    <span className="text-zinc-400 dark:text-zinc-600">Tech:</span>
                    {project.technologies.map((tech, idx) => (
                      <span key={idx} className="flex items-center gap-2">
                        <span className="text-zinc-700 dark:text-zinc-300">{tech}</span>
                        {idx < project.technologies.length - 1 && (
                          <span className="text-zinc-300 dark:text-zinc-800">•</span>
                        )}
                      </span>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

      </main>
    </PageLayout>
  );
};

export default ProjectsPage;
