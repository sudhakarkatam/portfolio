import React, { useState } from "react";
import { FaGithub, FaLinkedin, FaXTwitter } from "react-icons/fa6";
import { MdEmail } from "react-icons/md";
import { Copy, Check, FileText } from "lucide-react";
import { toast } from "sonner";
import { useISTClock } from "@/hooks/useISTClock";

interface ContactProps {
  contact: {
    email: string;
    github?: string;
    linkedin?: string;
    twitter?: string;
    resume?: string;
  };
}

export const Contact: React.FC<ContactProps> = ({ contact }) => {
  const timeStr = useISTClock("24h");
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(contact.email);
    setCopied(true);
    toast.success("Email copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const socialButtons = [
    {
      icon: FaGithub,
      href: contact.github,
      label: "GitHub",
      hoverStyle: "hover:border-zinc-800 dark:hover:border-zinc-200 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-900/10 dark:hover:bg-white/10",
    },
    {
      icon: FaLinkedin,
      href: contact.linkedin,
      label: "LinkedIn",
      hoverStyle: "hover:border-[#0A66C2]/60 hover:text-[#0A66C2] dark:hover:text-[#388ee6] hover:bg-[#0A66C2]/10",
    },
    {
      icon: FaXTwitter,
      href: contact.twitter,
      label: "X",
      hoverStyle: "hover:border-zinc-800 dark:hover:border-zinc-200 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-900/10 dark:hover:bg-white/10",
    },
    {
      icon: MdEmail,
      href: `mailto:${contact.email}`,
      label: "Email",
      hoverStyle: "hover:border-indigo-500/60 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-500/10",
    },
  ];

  return (
    <section id="contact" className="scroll-mt-24 space-y-10">

      {/* ── Contact Card with Gradient Border Accent ── */}
      <div className="relative rounded-3xl p-px bg-gradient-to-br from-indigo-500/20 via-transparent to-purple-500/20 dark:from-indigo-500/10 dark:via-transparent dark:to-purple-500/10 group hover:from-indigo-500/30 hover:to-purple-500/30 dark:hover:from-indigo-500/20 dark:hover:to-purple-500/20 transition-all duration-500">
        <div className="bg-white dark:bg-[#070709] rounded-[23px] p-8 sm:p-12 relative overflow-hidden">
          {/* Subtle radial glow */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-indigo-500/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

          <div className="relative z-10 max-w-xl space-y-6 text-left flex flex-col items-start">

            {/* Header */}
            <div className="text-[10px] font-bold tracking-[0.25em] text-zinc-500 dark:text-zinc-500 font-mono uppercase">
              CONTACT
            </div>

            {/* Title */}
            <div className="flex items-center gap-4 w-full">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white shrink-0">
                Let's Connect.
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-zinc-300 dark:from-zinc-700 to-transparent" />
            </div>

            {/* Subtitle */}
            <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed max-w-md">
              Always open to a good conversation, collaboration, just saying hello 😊
            </p>

            {/* Response time simple text */}
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
              Response time: usually within 24 hours
            </p>

            {/* ── Email Button + Copy ── */}
            <div className="pt-1 flex flex-wrap items-center gap-3">
              <a
                href={`mailto:${contact.email}`}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-zinc-950 dark:bg-white text-white dark:text-black font-bold text-xs sm:text-sm rounded-full hover:scale-[1.03] transition-all shadow-lg hover:shadow-xl dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.15)] cursor-pointer outline-none group"
              >
                <MdEmail size={17} className="group-hover:scale-110 transition-transform" />
                <span>{contact.email}</span>
              </a>
              <button
                onClick={handleCopyEmail}
                className="p-3.5 rounded-full border border-zinc-200 dark:border-[#1e1e24] bg-zinc-50 dark:bg-[#070709] text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:border-zinc-400 dark:hover:border-zinc-600 hover:scale-[1.08] transition-all outline-none"
                title="Copy email address"
              >
                {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              </button>
            </div>

            {/* ── Social Links as Labeled Pill Buttons with Branded Hover ── */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              {contact.resume && (
                <a
                  href={contact.resume}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:border-emerald-500/60 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 hover:scale-[1.03] transition-all duration-300"
                >
                  <FileText size={14} />
                  Resume
                </a>
              )}
              {socialButtons.map((social, idx) =>
                social.href ? (
                  <a
                    key={idx}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:scale-[1.03] transition-all duration-300 ${social.hoverStyle}`}
                    title={social.label}
                  >
                    <social.icon size={14} />
                    {social.label}
                  </a>
                ) : null
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Marcus Aurelius Quote */}
      <div className="text-center pt-1">
        <p className="text-xs text-zinc-400 dark:text-zinc-600 italic max-w-md mx-auto leading-relaxed">
          "It is not death that a man should fear, but he should fear never beginning to live." — Marcus Aurelius
        </p>
      </div>

      {/* Page Footer */}
      <div className="pt-6 border-t border-zinc-200 dark:border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-500">
        <div>
          © {new Date().getFullYear()} Sudhakar. Learning as I go ☕
        </div>

        {/* Live IST Clock */}
        <div className="flex items-center gap-2 font-mono font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>India</span>
          <span>·</span>
          <span>{timeStr || "00:00:00"}</span>
        </div>
      </div>

    </section>
  );
};
