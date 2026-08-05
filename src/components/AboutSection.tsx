import React from "react";

export const AboutSection: React.FC = () => {
  return (
    <section id="about" className="scroll-mt-24 space-y-8">

      {/* Section Header */}
      <div className="space-y-2">
        <div className="text-[10px] font-bold tracking-[0.25em] text-zinc-500 dark:text-zinc-500 font-mono uppercase">
          ABOUT
        </div>
        <div className="flex items-center gap-4">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            about
          </h2>
          <div className="h-px flex-1 bg-gradient-to-r from-zinc-300 dark:from-zinc-700 to-transparent" />
        </div>
      </div>

      {/* About Paragraphs */}
      <div className="space-y-5 text-zinc-600 dark:text-zinc-300 text-sm sm:text-base leading-relaxed max-w-3xl">
        <p>
          Hey, I'm Sudhakar. I enjoy building software, exploring AI, and content creation — turning ideas into products that solve real problems.
        </p>

        <p>
          Lately, I've been diving deep into <strong className="text-zinc-900 dark:text-white font-semibold">Agentic AI, LLMs, RAG, MCP, LangChain, LangGraph, cloud technologies, and backend system design</strong>.
        </p>

        <p>
          I build full-stack web apps, AI-powered features, and mobile apps, with a focus on turning ideas into useful products. I learn by building, shipping, and iterating—exploring new technologies along the way and continuously improving my engineering skills.
        </p>

        <p>
          Beyond coding, I'm interested in content creation. I enjoy sharing what I learn in a simple and practical way, helping others learn faster while documenting my own journey.
        </p>
      </div>

      {/* Developer Snapshot — Plain Bullet Points */}
      <div className="bg-white dark:bg-[#070709] border border-zinc-200 dark:border-[#1e1e24] rounded-3xl p-6 sm:p-8 space-y-4 hover:border-zinc-300 dark:hover:border-zinc-700/80 transition-all duration-300">
        <div className="text-[10px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 font-mono uppercase">
          DEVELOPER SNAPSHOT
        </div>

        <ul className="space-y-2.5 text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <li className="flex items-center gap-2.5">
            <span className="text-zinc-400 dark:text-zinc-600">•</span>
            <span>Building AI-powered applications.</span>
          </li>
          <li className="flex items-center gap-2.5">
            <span className="text-zinc-400 dark:text-zinc-600">•</span>
            <span>Exploring LLMs, RAG, MCP, and modern AI tooling.</span>
          </li>
          <li className="flex items-center gap-2.5">
            <span className="text-zinc-400 dark:text-zinc-600">•</span>
            <span>Full-stack developer.</span>
          </li>
          <li className="flex items-center gap-2.5">
            <span className="text-zinc-400 dark:text-zinc-600">•</span>
            <span>Always experimenting with new technologies.</span>
          </li>
          <li className="flex items-center gap-2.5">
            <span className="text-zinc-400 dark:text-zinc-600">•</span>
            <span>Always building something if possible differently.</span>
          </li>
          <li className="flex items-center gap-2.5">
            <span className="text-zinc-400 dark:text-zinc-600">•</span>
            <span>Curious about how things work.</span>
          </li>
        </ul>
      </div>

    </section>
  );
};
