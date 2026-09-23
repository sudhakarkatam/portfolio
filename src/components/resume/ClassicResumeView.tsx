import React, { useState, useMemo } from "react";
import { portfolioData } from "@/data/portfolioData";
import {
  Download,
  ExternalLink,
  Mail,
  MapPin,
  Printer,
  CheckCircle2,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";
import { FaGithub, FaLinkedin, FaXTwitter, FaTelegram } from "react-icons/fa6";

interface ClassicResumeViewProps {
  onExploreIn3D?: (nodeId?: string) => void;
}

export const ClassicResumeView: React.FC<ClassicResumeViewProps> = ({ onExploreIn3D }) => {
  const { name, bio, contact, skills, projects } = portfolioData;
  const [copiedText, setCopiedText] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  // Group skills by category
  const skillsByCategory = useMemo(() => {
    const map: Record<string, string[]> = {};
    skills.forEach((s) => {
      const cat = s.category || "General";
      if (!map[cat]) map[cat] = [];
      map[cat].push(s.name);
    });
    return map;
  }, [skills]);

  const handleCopyPlainText = () => {
    const plainText = `
SUDHAKAR REDDY KATAM
Aspiring Software Engineer | Building with AI & Web
Location: India (Open to Global Remote Roles)
Email: ${contact.email}
GitHub: ${contact.github}
LinkedIn: ${contact.linkedin}
X/Twitter: ${contact.twitter}
Telegram: ${contact.telegram} | Discord: ${contact.discord}
Resume: ${contact.resume}

==================================================
PROFESSIONAL SUMMARY
==================================================
${bio}

==================================================
TECHNICAL SKILLS & COMPETENCIES
==================================================
${Object.entries(skillsByCategory)
  .map(([cat, items]) => `• ${cat}: ${items.join(", ")}`)
  .join("\n")}

==================================================
FEATURED PRODUCTION PROJECTS
==================================================
${projects
  .map(
    (p, i) =>
      `${i + 1}. ${p.title} (${p.category || "Project"})\n` +
      `   ${p.link ? `Live: ${p.link}` : ""} ${p.github ? `| GitHub: ${p.github}` : ""}\n` +
      `   • ${p.description}\n` +
      (p.features ? `   • Features: ${p.features.join("; ")}\n` : "") +
      (p.learnings ? `   • Insights: ${p.learnings.join("; ")}\n` : "")
  )
  .join("\n")}
`.trim();

    navigator.clipboard.writeText(plainText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  return (
    <div className="space-y-6 print:space-y-0">
      {/* ── Action Toolbar (Hidden during print) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#070709] border border-zinc-200 dark:border-zinc-800 shadow-sm print:hidden">
        <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Complete ATS-Formatted Comprehensive Document View</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onExploreIn3D && (
            <button
              onClick={() => onExploreIn3D()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 transition-colors"
            >
              <Sparkles size={14} className="text-purple-500" />
              <span>Explore Knowledge Graph</span>
            </button>
          )}

          {/* Copy Plain Text for Job Portals */}
          <button
            onClick={handleCopyPlainText}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
            title="Copy plain-text formatted resume to clipboard for job portal fields"
          >
            {copiedText ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            <span>{copiedText ? "Copied Plain Text!" : "Copy for Job Portals"}</span>
          </button>

          {/* Print / Save PDF */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            <Printer size={14} />
            <span>Print / Save PDF</span>
          </button>

          {/* Direct Drive Download */}
          {contact.resume && (
            <a
              href={contact.resume}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-zinc-950 dark:bg-white text-white dark:text-black hover:scale-[1.02] transition-transform shadow-md"
            >
              <Download size={14} />
              <span>Download PDF (Drive)</span>
            </a>
          )}
        </div>
      </div>

      {/* ── ATS Resume Sheet ── */}
      <div className="bg-white dark:bg-[#070709] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-10 md:p-12 shadow-xl space-y-6 text-zinc-800 dark:text-zinc-200 print:bg-white print:text-black print:border-none print:shadow-none print:p-0 print:m-0 print:space-y-4">
        
        {/* Header */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 print:border-zinc-400 pb-5 space-y-2 print:pb-3">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-white print:text-black tracking-tight">
              {name}
            </h1>
            <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 print:text-zinc-600 font-mono">
              <MapPin size={12} />
              <span>India • Open to Global & Remote Roles</span>
            </div>
          </div>

          <p className="text-xs sm:text-sm font-semibold text-purple-600 dark:text-purple-400 print:text-zinc-800">
            Aspiring Software Engineer | Building with AI & Web
          </p>

          {/* Links & Contact Bar */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-600 dark:text-zinc-400 print:text-zinc-800 font-mono pt-1">
            <a
              href={`mailto:${contact.email}`}
              className="inline-flex items-center gap-1.5 hover:text-zinc-950 dark:hover:text-white print:text-black underline decoration-zinc-300 dark:decoration-zinc-700"
            >
              <Mail size={12} />
              <span>{contact.email}</span>
            </a>

            {contact.github && (
              <a
                href={contact.github}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-zinc-950 dark:hover:text-white print:text-black"
              >
                <FaGithub size={12} />
                <span>github.com/sudhakarkatam</span>
              </a>
            )}

            {contact.linkedin && (
              <a
                href={contact.linkedin}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-zinc-950 dark:hover:text-white print:text-black"
              >
                <FaLinkedin size={12} />
                <span>linkedin.com/in/sudhakar-katam</span>
              </a>
            )}

            {contact.twitter && (
              <a
                href={contact.twitter}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-zinc-950 dark:hover:text-white print:text-black"
              >
                <FaXTwitter size={12} />
                <span>@sudhakarkatam2</span>
              </a>
            )}

            {contact.telegram && (
              <span className="inline-flex items-center gap-1">
                <FaTelegram size={12} />
                <span>Telegram: @Sudha7248</span>
              </span>
            )}
          </div>
        </div>

        {/* Section: Professional Summary */}
        <div className="space-y-2 break-inside-avoid print:break-inside-avoid">
          <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 dark:text-zinc-500 print:text-zinc-700 font-bold">
            // Professional Summary
          </div>
          <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 print:text-zinc-900 font-sans">
            {bio}
          </p>
        </div>

        {/* Section: Technical Skills Matrix */}
        <div className="space-y-3 break-inside-avoid print:break-inside-avoid">
          <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 dark:text-zinc-500 print:text-zinc-700 font-bold">
            // Technical Skills & Competencies
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:grid-cols-2 print:gap-2">
            {Object.entries(skillsByCategory).map(([cat, items]) => (
              <div
                key={cat}
                className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 print:border-zinc-300 bg-zinc-50/50 dark:bg-zinc-900/30 print:bg-white space-y-1.5"
              >
                <div className="font-bold text-xs text-zinc-900 dark:text-white print:text-black flex items-center justify-between">
                  <span>{cat}</span>
                </div>
                <div className="text-[11px] text-zinc-600 dark:text-zinc-400 print:text-zinc-800 leading-snug">
                  {items.join(", ")}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section: Featured Production Projects */}
        <div className="space-y-4 print:space-y-3">
          <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 dark:text-zinc-500 print:text-zinc-700 font-bold">
            // Featured Production Projects
          </div>

          <div className="space-y-4 print:space-y-3">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 print:border-zinc-300 bg-zinc-50/50 dark:bg-zinc-900/30 print:bg-white space-y-3 break-inside-avoid print:break-inside-avoid"
              >
                {/* Project Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-zinc-950 dark:text-white print:text-black">
                      {proj.title}
                    </h3>
                    {proj.category && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 print:text-zinc-700 border border-purple-500/20 font-bold">
                        {proj.category}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono print:text-[10px]">
                    {proj.github && (
                      <a
                        href={proj.github}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-950 dark:hover:text-white print:text-black underline"
                      >
                        <FaGithub size={11} />
                        <span>Source</span>
                      </a>
                    )}
                    {proj.link && (
                      <a
                        href={proj.link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 print:text-black font-semibold underline"
                      >
                        <ExternalLink size={11} />
                        <span>Live Demo / Store</span>
                      </a>
                    )}
                  </div>
                </div>

                <p className="text-xs text-zinc-700 dark:text-zinc-300 print:text-zinc-900 leading-relaxed">
                  {proj.description}
                </p>

                {/* Key Features */}
                {proj.features && proj.features.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono uppercase text-zinc-400 print:text-zinc-600 font-bold">
                      Key Features:
                    </div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400 print:text-zinc-800">
                      {proj.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <CheckCircle2 size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span className="leading-snug">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Learnings */}
                {proj.learnings && proj.learnings.length > 0 && (
                  <div className="text-[11px] text-zinc-600 dark:text-zinc-400 print:text-zinc-800 bg-zinc-100/70 dark:bg-zinc-800/40 print:bg-zinc-100 p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 print:border-zinc-300">
                    <strong className="text-zinc-900 dark:text-zinc-200 print:text-black font-mono text-[10px] uppercase">
                      Engineering Insights:{" "}
                    </strong>
                    {proj.learnings.join("; ")}
                  </div>
                )}

                {/* Tech Stack Chips */}
                {proj.technologies && proj.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {proj.technologies.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-zinc-200/70 dark:bg-zinc-800/80 print:bg-zinc-100 text-zinc-700 dark:text-zinc-300 print:text-black"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ClassicResumeView;
