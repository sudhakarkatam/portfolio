import React, { useState, useEffect } from "react";
import { FaGithub } from "react-icons/fa6";
import { ArrowUpRight, X, Sparkles, Eye, Code2 } from "lucide-react";
import { Project } from "@/types/portfolio";

interface ProjectsProps {
  projects: Project[];
}

// Clean Mockup Renderer matching Keshavv's full-width image style
const ProjectMockup = ({ projectId }: { projectId: string }) => {
  switch (projectId) {
    case "1": // Personal Tracker App
      return (
        <div className="w-full h-72 sm:h-96 md:h-[420px] bg-zinc-50 dark:bg-[#0a0a0c] rounded-3xl flex items-center justify-center p-6 overflow-hidden relative">
          <div className="w-52 sm:w-64 h-64 sm:h-80 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-t-3xl p-4 space-y-3 shadow-2xl relative translate-y-10 group-hover:translate-y-6 transition-transform duration-500">
            <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-800 rounded-full mx-auto mb-3" />
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold tracking-widest text-center uppercase">DAILY HABITS</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-sm">💧</span>
                  <span className="text-xs text-zinc-800 dark:text-zinc-200 font-semibold">Drink 3L Water</span>
                </div>
                <span className="text-xs text-emerald-500 font-bold">✓</span>
              </div>
              <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🏋️</span>
                  <span className="text-xs text-zinc-800 dark:text-zinc-200 font-semibold">Workout 45 mins</span>
                </div>
                <span className="text-xs text-emerald-500 font-bold">✓</span>
              </div>
              <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 opacity-60">
                <div className="flex items-center gap-2">
                  <span className="text-sm">📖</span>
                  <span className="text-xs text-zinc-800 dark:text-zinc-200 font-semibold">Read 20 Pages</span>
                </div>
                <span className="text-xs text-zinc-500">○</span>
              </div>
            </div>
            <div className="absolute bottom-3 left-3 right-3 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl flex justify-between items-center">
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">STREAK</span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-extrabold">18 Days 🔥</span>
            </div>
          </div>
        </div>
      );

    case "2": // Financial Calculators App
      return (
        <div className="w-full h-72 sm:h-96 md:h-[420px] bg-zinc-50 dark:bg-[#0a0a0c] rounded-3xl flex items-center justify-center p-6 overflow-hidden relative">
          <div className="w-full max-w-[340px] sm:max-w-[440px] space-y-4 group-hover:scale-105 transition-transform duration-500">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <span className="text-sm sm:text-base font-bold text-zinc-800 dark:text-zinc-200">SIP Returns Growth</span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full font-bold">+12.4% ARR</span>
            </div>
            <div className="h-32 sm:h-40 flex items-end gap-3 justify-between px-1">
              <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-10 rounded-md" />
              <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-16 rounded-md" />
              <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-24 rounded-md" />
              <div className="w-full bg-zinc-300 dark:bg-zinc-800 h-28 rounded-md" />
              <div className="w-full bg-emerald-500/30 border border-emerald-500/50 h-36 sm:h-40 rounded-md relative" />
            </div>
            <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 font-medium pt-1">
              <span>Invested Amount: ₹1.2L</span>
              <span className="text-zinc-900 dark:text-zinc-200 font-bold">Est. Maturity: ₹2.48L</span>
            </div>
          </div>
        </div>
      );

    case "3": // Ecommerce Product Recommendation
      return (
        <div className="w-full h-72 sm:h-96 md:h-[420px] bg-zinc-50 dark:bg-[#0a0a0c] rounded-3xl flex items-center justify-center p-6 overflow-hidden relative">
          <div className="w-full max-w-[360px] sm:max-w-[460px] space-y-3 group-hover:scale-105 transition-transform duration-500">
            <div className="text-xs font-bold tracking-widest text-indigo-500 dark:text-indigo-400 flex items-center gap-2 uppercase">
              <Sparkles size={12} /> AI PRODUCT RECOMMENDATIONS
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 sm:p-4 space-y-2 shadow-sm">
                <div className="aspect-square bg-zinc-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center text-2xl">⚡</div>
                <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">Mechanical Keyboard</div>
                <div className="text-[10px] text-purple-500 font-bold">98% Match Rating</div>
              </div>
              <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 sm:p-4 space-y-2 shadow-sm">
                <div className="aspect-square bg-zinc-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center text-2xl">🎧</div>
                <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">Studio ANC Headphones</div>
                <div className="text-[10px] text-purple-500 font-bold">94% Match Rating</div>
              </div>
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div className="w-full h-72 sm:h-96 md:h-[420px] bg-zinc-50 dark:bg-[#0a0a0c] rounded-3xl flex items-center justify-center p-6">
          <Code2 size={48} className="text-zinc-400 dark:text-zinc-700" />
        </div>
      );
  }
};

export const Projects: React.FC<ProjectsProps> = ({ projects }) => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Close modal when Escape key is pressed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedProject(null);
      }
    };

    if (selectedProject) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedProject]);

  return (
    <section id="projects" className="scroll-mt-24 space-y-10">
      
      {/* Section Header with Horizontal Divider Line */}
      <div className="space-y-2">
        <div className="text-[10px] font-bold tracking-[0.25em] text-zinc-500 dark:text-zinc-500 font-mono uppercase">THINGS I'VE BUILT</div>
        <div className="flex items-center gap-4">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Featured Projects</h2>
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800/40" />
        </div>
      </div>

      {/* Project Cards List */}
      <div className="space-y-16">
        {projects.map((project) => {
          const liveUrl = project.link || project.liveUrl;

          return (
            <div key={project.id} className="space-y-4 group">
              
              {/* Card Title Header sitting directly on page background */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                    {project.title}
                  </h3>
                  <span className="text-[9px] font-bold tracking-widest text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-1 rounded-full uppercase">
                    FEATURED
                  </span>
                </div>

                {/* Both GitHub & Link icons on title line */}
                <div className="flex items-center gap-3">
                  {(project.github || project.githubUrl) && (
                    <a
                      href={project.github || project.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                      title="GitHub Codebase"
                    >
                      <FaGithub size={20} />
                    </a>
                  )}
                  {liveUrl && (
                    <a
                      href={liveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                      title="Live Preview"
                    >
                      <ArrowUpRight size={22} />
                    </a>
                  )}
                </div>
              </div>

              {/* Large Mockup Image Container */}
              <div
                onClick={() => setSelectedProject(project)}
                className="relative cursor-pointer overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800/90 group/mockup hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-lg dark:shadow-2xl"
              >
                <ProjectMockup projectId={project.id} />

                {/* Glass "Open Details" Button Overlay */}
                <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] opacity-0 group-hover/mockup:opacity-100 transition-all duration-300 flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProject(project);
                    }}
                    className="px-6 py-3 rounded-full bg-white/90 dark:bg-zinc-900/90 text-zinc-900 dark:text-white text-xs font-bold shadow-xl border border-white/20 backdrop-blur-md hover:scale-105 transition-transform flex items-center gap-2"
                  >
                    <span>Open Details</span>
                    <Eye size={14} />
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* "Open Details" Modal Dialog */}
      {selectedProject && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setSelectedProject(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#181818] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-6 shadow-2xl relative"
          >
            {/* Modal Top Header */}
            <div className="flex items-start justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">{selectedProject.title}</h3>
                  <span className="text-[9px] font-bold tracking-widest text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2.5 py-0.5 rounded-full uppercase">
                    FEATURED
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{selectedProject.description}</p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedProject(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors outline-none shrink-0"
                title="Close (Esc)"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Large Mockup Container */}
            <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
              <ProjectMockup projectId={selectedProject.id} />
            </div>

            {/* Overview Section */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase">OVERVIEW</div>
              <p className="text-xs sm:text-sm text-zinc-650 dark:text-zinc-300 leading-relaxed">
                {selectedProject.description} Designed with clean architecture, responsive layouts, and robust backend handling for high performance.
              </p>
            </div>

            {/* Technologies Badges */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase">BUILT WITH</div>
              <div className="flex flex-wrap gap-2">
                {selectedProject.technologies.map((tech) => (
                  <span
                    key={tech}
                    className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-750 px-3 py-1 rounded-xl"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom Modal Actions */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
              {(selectedProject.github || selectedProject.githubUrl) && (
                <a
                  href={selectedProject.github || selectedProject.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white text-xs font-bold transition-all border border-zinc-200 dark:border-zinc-700"
                >
                  <FaGithub size={15} />
                  <span>Codebase</span>
                </a>
              )}
              {(selectedProject.link || selectedProject.liveUrl) && (
                <a
                  href={selectedProject.link || selectedProject.liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-black text-xs font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-md"
                >
                  <span>Live Preview</span>
                  <ArrowUpRight size={15} />
                </a>
              )}
            </div>

          </div>
        </div>
      )}

    </section>
  );
};
