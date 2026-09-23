import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { ObsidianGraphView } from "@/components/resume/ObsidianGraphView";
import {
  VectorNode,
  RESUME_VECTOR_NODES,
  VECTOR_CLUSTERS,
  RAG_PRESET_QUERIES,
  RAGPresetQuery,
} from "@/data/resumeVectorData";
import { portfolioData } from "@/data/portfolioData";
import {
  Search,
  X,
  FileDown,
  ExternalLink,
  Sparkles,
  Bookmark,
  CheckCircle2,
  ArrowRight,
  Share2,
  Compass,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const ResumePage: React.FC = () => {
  const navigate = useNavigate();

  // Search & Node selection state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<VectorNode | null>(RESUME_VECTOR_NODES[0]);
  const [activePreset, setActivePreset] = useState<RAGPresetQuery | null>(null);
  const [activeClusterFilter, setActiveClusterFilter] = useState<string | null>(null);

  const handleNavigateNavbar = useCallback(
    (id: string) => {
      if (id === "projects") {
        navigate("/projects");
      } else if (id === "contact") {
        navigate("/#contact");
      } else {
        navigate("/");
      }
    },
    [navigate]
  );

  // Compute matched node IDs based on search or active preset
  const highlightedNodeIds = useMemo(() => {
    if (activePreset) {
      return activePreset.relevantNodeIds;
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    return RESUME_VECTOR_NODES.filter((node) => {
      const matchLabel = node.label.toLowerCase().includes(q);
      const matchTitle = node.title.toLowerCase().includes(q);
      const matchDesc = node.description.toLowerCase().includes(q);
      const matchTech = (node.codeOrTech || []).some((t) => t.toLowerCase().includes(q));
      const matchTags = (node.semanticTags || []).some((t) => t.toLowerCase().includes(q));
      return matchLabel || matchTitle || matchDesc || matchTech || matchTags;
    }).map((n) => n.id);
  }, [searchQuery, activePreset]);

  // When search matches nodes, automatically pick the top match if no node is explicitly selected
  const handleSelectNode = useCallback((node: VectorNode | null) => {
    setSelectedNode(node);
    if (node) {
      setActivePreset(null);
    }
  }, []);

  const handleSelectPreset = (preset: RAGPresetQuery) => {
    if (activePreset?.id === preset.id) {
      setActivePreset(null);
      setSearchQuery("");
      return;
    }
    setActivePreset(preset);
    setSearchQuery(preset.query);
    const firstMatched = RESUME_VECTOR_NODES.find((n) => preset.relevantNodeIds.includes(n.id));
    if (firstMatched) {
      setSelectedNode(firstMatched);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setActivePreset(null);
  };

  return (
    <PageLayout activeSection="resume" onNavigate={handleNavigateNavbar}>
      <main className="w-full pt-16 sm:pt-20 px-3 sm:px-6 pb-4 min-h-[calc(100vh)] flex flex-col select-text">
        <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          
          {/* ── LEFT PANE: Minimal Search, Presets & Selected Node Details (4.5 cols) ── */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-full bg-white dark:bg-[#09090e] border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-4 sm:p-5 shadow-xl backdrop-blur-xl overflow-hidden">
            
            {/* Header: Candidate Info & PDF Download */}
            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0">
              <div className="space-y-0.5">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-zinc-950 dark:text-white">
                  {portfolioData.name}
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                  Neural Vector Graph • Gemini RAG
                </p>
              </div>

              {portfolioData.contact.resume && (
                <a
                  href={portfolioData.contact.resume}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold transition-all shadow-sm shrink-0"
                  title="Download Verified PDF Resume"
                >
                  <FileDown size={13} />
                  <span>PDF Resume</span>
                </a>
              )}
            </div>

            {/* Interactive Search Bar */}
            <div className="pt-3 pb-2 shrink-0 space-y-2">
              <div className="relative flex items-center bg-zinc-100/80 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-3 py-2 transition-all focus-within:border-purple-500/70 focus-within:ring-1 focus-within:ring-purple-500/20">
                <Search size={14} className="text-zinc-400 shrink-0 mr-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (activePreset) setActivePreset(null);
                  }}
                  placeholder="Search skills, architecture, projects..."
                  className="flex-1 bg-transparent text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none font-sans"
                />
                {searchQuery && (
                  <button
                    onClick={handleClearSearch}
                    className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Quick Preset Query Pills */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {RAG_PRESET_QUERIES.map((preset) => {
                  const isActive = activePreset?.id === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border transition-all ${
                        isActive
                          ? "bg-purple-600 text-white border-purple-500 font-bold shadow-sm"
                          : "bg-zinc-100/70 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700"
                      }`}
                    >
                      {preset.id === "rag_ai" && "Agentic RAG"}
                      {preset.id === "crypto_droply" && "Droply Security"}
                      {preset.id === "fullstack_mobile" && "Mobile Apps"}
                      {preset.id === "backend_db" && "Backend & DBs"}
                      {preset.id === "contact_links" && "Contact Info"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Preset Answer Banner (if preset is selected) */}
            {activePreset && (
              <div className="my-2 p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed shrink-0">
                <span className="font-mono text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 block mb-1">
                  Synthesized Answer:
                </span>
                {activePreset.summaryAnswer}
              </div>
            )}

            {/* Scrollable Node Inspector / Details Body */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 pt-1 font-sans text-left">
              {selectedNode ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedNode.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-4"
                  >
                    {/* Domain & Title */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: selectedNode.color }}
                        />
                        <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-purple-600 dark:text-purple-400">
                          {selectedNode.clusterLabel}
                        </span>
                      </div>
                      <h2 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white">
                        {selectedNode.title}
                      </h2>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                        {selectedNode.subtitle}
                      </p>
                    </div>

                    {/* Overview */}
                    <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {selectedNode.description}
                    </p>

                    {/* Key Highlights / Metrics */}
                    {selectedNode.metricsOrHighlights && selectedNode.metricsOrHighlights.length > 0 && (
                      <div className="space-y-2 bg-zinc-50 dark:bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                          Key Capabilities:
                        </span>
                        <ul className="space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                          {selectedNode.metricsOrHighlights.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-purple-500 font-bold shrink-0">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Architectural Learnings (if project) */}
                    {selectedNode.featuresOrLearnings && selectedNode.featuresOrLearnings.length > 0 && (
                      <div className="space-y-2 bg-purple-500/5 p-3.5 rounded-2xl border border-purple-500/15">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-purple-600 dark:text-purple-400 font-bold block">
                          Architecture & Learnings:
                        </span>
                        <ul className="space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                          {selectedNode.featuresOrLearnings.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle2 size={13} className="text-purple-500 shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Tech Stack Pills */}
                    {selectedNode.codeOrTech && selectedNode.codeOrTech.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                          Technologies:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedNode.codeOrTech.map((tech, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] font-mono px-2.5 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Connected Synaptic Nodes */}
                    {selectedNode.connections && selectedNode.connections.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                          Connected Synapses ({selectedNode.connections.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedNode.connections.map((connId) => {
                            const neighbor = RESUME_VECTOR_NODES.find((n) => n.id === connId);
                            if (!neighbor) return null;
                            return (
                              <button
                                key={connId}
                                onClick={() => handleSelectNode(neighbor)}
                                className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/20 transition-colors"
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: neighbor.color }}
                                />
                                <span>{neighbor.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Live Demos & GitHub Links */}
                    {(selectedNode.externalLink || selectedNode.githubLink) && (
                      <div className="flex items-center gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                        {selectedNode.externalLink && (
                          <a
                            href={selectedNode.externalLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors shadow-sm"
                          >
                            <span>Live Demo</span>
                            <ExternalLink size={12} />
                          </a>
                        )}
                        {selectedNode.githubLink && (
                          <a
                            href={selectedNode.githubLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white text-xs font-bold transition-colors border border-zinc-200 dark:border-zinc-700"
                          >
                            <span>GitHub Code</span>
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-zinc-400">
                  <Compass size={32} className="text-purple-500/50" />
                  <p className="text-xs font-mono">
                    Click any node on the graph to inspect technical capabilities, or select a preset above.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT PANE: Full-Height Interactive Neural Knowledge Graph (7.5 cols) ── */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full min-h-[520px] rounded-3xl overflow-hidden shadow-2xl relative">
            <ObsidianGraphView
              selectedNode={selectedNode}
              onSelectNode={handleSelectNode}
              highlightedNodeIds={highlightedNodeIds}
              activeClusterFilter={activeClusterFilter}
              onSelectCluster={setActiveClusterFilter}
            />
          </div>

        </div>
      </main>
    </PageLayout>
  );
};

export default ResumePage;
