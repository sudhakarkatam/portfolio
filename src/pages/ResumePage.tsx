import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { VectorGraph3D } from "@/components/resume/VectorGraph3D";
import { RAGSearchSimulator } from "@/components/resume/RAGSearchSimulator";
import { ClassicResumeView } from "@/components/resume/ClassicResumeView";
import { VectorNode, RESUME_VECTOR_NODES } from "@/data/resumeVectorData";
import { portfolioData } from "@/data/portfolioData";
import {
  Sparkles,
  FileText,
  Boxes,
  Download,
  X,
  ExternalLink,
  Layers,
  ArrowRight,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const ResumePage: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"3d_vector" | "classic">("3d_vector");
  const [selectedNode, setSelectedNode] = useState<VectorNode | null>(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<string[]>([]);
  const [activeClusterFilter, setActiveClusterFilter] = useState<string | null>(null);

  const handleNavigateNavbar = useCallback((id: string) => {
    if (id === "projects") {
      navigate("/projects");
    } else if (id === "contact") {
      navigate("/#contact");
    } else {
      navigate("/");
    }
  }, [navigate]);

  const handleRAGResultsChange = useCallback((matchedNodeIds: string[]) => {
    setHighlightedNodeIds((prev) => {
      if (prev.length === matchedNodeIds.length && prev.every((id, i) => id === matchedNodeIds[i])) {
        return prev;
      }
      return matchedNodeIds;
    });
  }, []);

  const handleSelectNeighbor = useCallback((neighborId: string) => {
    const node = RESUME_VECTOR_NODES.find((n) => n.id === neighborId);
    if (node) setSelectedNode(node);
  }, []);

  const handleSelectNode = useCallback((node: VectorNode | null) => {
    setSelectedNode(node);
  }, []);

  return (
    <PageLayout activeSection="resume" onNavigate={handleNavigateNavbar}>
      {/* Centered container aligned to max 900px for comfortable 3D + RAG viewing, full width on print */}
      <main className="relative z-10 mx-auto max-w-[900px] px-4 sm:px-6 pt-8 sm:pt-28 pb-28 sm:pb-24 space-y-8 print:p-0 print:m-0 print:max-w-none print:space-y-0">
        
        {/* Header Row (Hidden on print) */}
        <div className="space-y-4 pt-2 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-mono font-semibold tracking-wider text-purple-600 dark:text-purple-400 uppercase flex items-center gap-2">
                <Sparkles size={13} />
                <span>AI KNOWLEDGE GRAPH & RESUME</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
                Interactive Resume
              </h1>
            </div>

            {/* View Mode Switcher Pill */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shrink-0 self-start sm:self-auto">
              <button
                onClick={() => setViewMode("3d_vector")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  viewMode === "3d_vector"
                    ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                <Boxes size={14} className="text-purple-500" />
                <span>3D Vector Graph</span>
              </button>

              <button
                onClick={() => setViewMode("classic")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  viewMode === "classic"
                    ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                <FileText size={14} className="text-emerald-500" />
                <span>Classic ATS</span>
              </button>

              {portfolioData.contact.resume && (
                <a
                  href={portfolioData.contact.resume}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
                  title="Download Raw PDF"
                >
                  <Download size={15} />
                </a>
              )}
            </div>
          </div>

          <p className="text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed max-w-2xl">
            {viewMode === "3d_vector"
              ? "Explore Sudhakar's experience, skills, and projects mapped into 3D vector embedding space. Use the RAG query simulator below to compute cosine similarity in real time."
              : "Clean, ATS-friendly resume breakdown with direct download and print capabilities."}
          </p>
        </div>

        {/* ── View 1: 3D Vector Space & RAG Simulator ── */}
        {viewMode === "3d_vector" ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* 3D Vector Space Canvas */}
            <VectorGraph3D
              selectedNode={selectedNode}
              onSelectNode={handleSelectNode}
              highlightedNodeIds={highlightedNodeIds}
              activeClusterFilter={activeClusterFilter || undefined}
              onSelectCluster={setActiveClusterFilter}
            />

            {/* RAG Search & Similarity Inspector */}
            <RAGSearchSimulator
              onResultsChange={handleRAGResultsChange}
              onSelectNode={handleSelectNode}
            />
          </motion.div>
        ) : (
          /* ── View 2: Classic ATS Resume ── */
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ClassicResumeView
              onExploreIn3D={(nodeId) => {
                setViewMode("3d_vector");
                if (nodeId) handleSelectNeighbor(nodeId);
              }}
            />
          </motion.div>
        )}

      </main>

      {/* ── Slide-Over Modal / Drawer for Selected Vector Node ── */}
      <AnimatePresence>
        {selectedNode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg bg-white dark:bg-[#0f0f14] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-left max-h-[85vh] overflow-y-auto"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedNode(null)}
                className="absolute top-5 right-5 p-2 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Close"
              >
                <X size={16} />
              </button>

              {/* Header Info */}
              <div className="space-y-1.5 pr-8">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: selectedNode.color }}
                  />
                  <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase">
                    {selectedNode.clusterLabel}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800">
                    vector ({selectedNode.x}, {selectedNode.y}, {selectedNode.z})
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
                  {selectedNode.title}
                </h3>
                <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                  {selectedNode.subtitle}
                </p>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-zinc-650 dark:text-zinc-300 leading-relaxed">
                {selectedNode.description}
              </p>

              {/* Key Highlights */}
              {selectedNode.metricsOrHighlights && selectedNode.metricsOrHighlights.length > 0 && (
                <div className="space-y-2 bg-zinc-50 dark:bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                    Key Highlights & Capabilities:
                  </span>
                  <ul className="space-y-1 text-xs text-zinc-700 dark:text-zinc-300">
                    {selectedNode.metricsOrHighlights.map((highlight, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-purple-500 font-bold">•</span>
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Features or Learnings if project */}
              {selectedNode.featuresOrLearnings && selectedNode.featuresOrLearnings.length > 0 && (
                <div className="space-y-2 bg-purple-500/5 p-3.5 rounded-2xl border border-purple-500/20">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-purple-600 dark:text-purple-400 font-bold block">
                    Features & Engineering Architecture:
                  </span>
                  <ul className="space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                    {selectedNode.featuresOrLearnings.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-purple-500 font-bold shrink-0 mt-0.5">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tech Stack Pills */}
              {selectedNode.codeOrTech && selectedNode.codeOrTech.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Stack & Concepts:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNode.codeOrTech.map((tech, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] font-mono font-medium px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Connected Semantic Neighbors in Vector Space */}
              {selectedNode.connections && selectedNode.connections.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Connected Embedding Neighbors:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNode.connections.map((connId) => {
                      const neighbor = RESUME_VECTOR_NODES.find((n) => n.id === connId);
                      if (!neighbor) return null;
                      return (
                        <button
                          key={connId}
                          onClick={() => handleSelectNeighbor(connId)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 transition-colors"
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: neighbor.color }}
                          />
                          <span>{neighbor.label}</span>
                          <ArrowRight size={10} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons (GitHub & Live Links) */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {selectedNode.githubLink && (
                  <a
                    href={selectedNode.githubLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 flex-1 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-white font-bold text-xs hover:scale-[1.01] transition-transform"
                  >
                    <span>View GitHub Source</span>
                    <ExternalLink size={12} />
                  </a>
                )}
                {selectedNode.externalLink && (
                  <a
                    href={selectedNode.externalLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 flex-1 py-2.5 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-black font-bold text-xs hover:scale-[1.01] transition-transform shadow-md"
                  >
                    <span>Live Deployment</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageLayout>
  );
};

export default ResumePage;
