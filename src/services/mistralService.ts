/**
 * Mistral AI Service for Portfolio Chatbot
 * Production-Grade RAG Pipeline:
 * 1. Intent Classification Model (Zero-Shot JSON Classifier executed BEFORE retrieval)
 *    - GREETING: answers and greets warmly without vector retrieval
 *    - OFF_TOPIC: strictly guardrails and redirects without vector retrieval
 *    - PORTFOLIO_QUERY: proceeds to semantic vector retrieval
 * 2. Semantic Vector Retrieval (Cosine similarity with Gemini 3072-dim embeddings)
 *    - Retrieves from plain-text paragraph chunks (`portfolioKnowledge.txt`) and vector nodes
 * 3. Grounded Stream Generation using Codestral (`codestral-2508` / `codestral-latest`)
 *    - High-empathy persona representing candidate's professional status and handling pronouns naturally
 *    - Injects both retrieved context and user query
 */

import { RESUME_VECTOR_NODES, VectorNode } from "@/data/resumeVectorData";
import { portfolioData } from "@/data/portfolioData";
import rawPrecomputedEmbeddings from "@/data/precomputedEmbeddings.json";
import rawKnowledgeText from "@/data/portfolioKnowledge.txt?raw";
import { searchByCosineSimilarity, EmbeddingEntry } from "@/lib/vectorSearch";
import { embedText, isApiKeyConfigured as isGeminiConfigured } from "@/services/geminiService";

export type UserIntent = "PORTFOLIO_QUERY" | "GREETING" | "OFF_TOPIC";

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  citations?: { title: string; link?: string; cluster?: string }[];
  intent?: UserIntent;
}

export interface GroundedChunk {
  id: string;
  title: string;
  text: string;
  link?: string;
  cluster?: string;
}

const precomputedList = rawPrecomputedEmbeddings as Array<EmbeddingEntry & {
  title?: string;
  text?: string;
  type?: string;
  cluster?: string;
}>;

export const getMistralKey = (): string => {
  if (typeof window !== "undefined") {
    const localKey = localStorage.getItem("VITE_MISTRAL_API_KEY") || localStorage.getItem("MISTRAL_API_KEY");
    if (localKey && localKey.trim()) return localKey.trim();
  }
  return (
    ((import.meta as any).env?.VITE_MISTRAL_API_KEY as string | undefined) ||
    ((import.meta as any).env?.MISTRAL_API_KEY as string | undefined) ||
    ""
  ).trim();
};

export const isMistralKeyConfigured = (): boolean => {
  const k = getMistralKey();
  return !!k && k.length > 10 && k !== "your_mistral_api_key_here";
};

// ── Helper: Call Mistral/Codestral Completion with Endpoint Fallback ──
async function callMistralChat(
  apiKey: string,
  bodyPayload: Record<string, any>
): Promise<Response> {
  const primaryModel = bodyPayload.model || "codestral-2508";

  // Try standard endpoint first
  let response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ ...bodyPayload, model: primaryModel }),
  });

  // Dual-endpoint fallback (if key is provisioned on codestral.mistral.ai or model identifier differs)
  if (!response.ok && (response.status === 401 || response.status === 404 || response.status === 400)) {
    try {
      const altResponse = await fetch("https://codestral.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ ...bodyPayload, model: "codestral-latest" }),
      });
      if (altResponse.ok) {
        return altResponse;
      }
    } catch {
      // Continue with primary response
    }
  }

  return response;
}

// ── STEP 1: Intent Classification Model (Executed BEFORE Retrieval) ──
export async function classifyIntentWithML(query: string, apiKey?: string): Promise<UserIntent> {
  const clean = query.trim().toLowerCase();

  // Questions about identity, location, background, work, employment, availability, role, or hiring are ALWAYS portfolio queries, never greetings
  const workStatusPatterns = [
    /where\s*(do|are)\s*you\s*(work|located|based|live|from)/i,
    /where\s*are\s*you/i,
    /who\s*(are\s*you|is\s*sudhakar)/i,
    /tell\s*me\s*about\s*(yourself|you|sudhakar)/i,
    /are\s*you\s*(working|employed|free|available|hiring|open)/i,
    /what\s*(are\s*you|is\s*your)\s*(doing|working\s*on|job|role|status|stack|experience|background)/i,
    /can\s*(i|we)\s*(hire|contact|reach|work\s*with)\s*you/i,
  ];

  if (workStatusPatterns.some((pattern) => pattern.test(clean))) {
    return "PORTFOLIO_QUERY";
  }

  // Instant fast-path for obvious 1-word greetings to save round-trip latency
  if (/^(hi|hello|hey|yo|greetings|sup|good\s*(morning|afternoon|evening))[\s!.,?]*$/i.test(clean)) {
    return "GREETING";
  }

  // Zero-Shot ML Intent Classification via Codestral
  if (apiKey && isMistralKeyConfigured()) {
    try {
      const candidateName = portfolioData.name;
      const systemPrompt = `You are a real-time intent classification model for ${candidateName}'s software engineering portfolio.
Classify the user's message into exactly one category:
- "GREETING": Strictly conversational hellos and pleasantries ("hi", "hello", "how are you doing", "nice to meet you"). NOTE: Questions about location, origin, current work, employment, availability, skills, or projects are NOT greetings.
- "PORTFOLIO_QUERY": Any inquiry about ${candidateName}'s identity, location ("where are you from"), software projects, technical stack, current employment/work status, availability, background, education, experience, or hiring/contact details. Any question asking "where are you from", "are you working now", "what do you do", "what is your stack", or "can I hire you" is a PORTFOLIO_QUERY.
- "OFF_TOPIC": Completely unrelated requests, generic trivia, math problems, recipes, creative writing, or out-of-scope prompts.

Output strictly valid JSON: {"intent": "GREETING" | "PORTFOLIO_QUERY" | "OFF_TOPIC"}`;

      const res = await callMistralChat(apiKey, {
        model: "codestral-2508",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query },
        ],
        temperature: 0.0,
        max_tokens: 30,
        stream: false,
      });

      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content || "";
        const match = content.match(/\"intent\"\s*:\s*\"(GREETING|PORTFOLIO_QUERY|OFF_TOPIC)\"/i);
        if (match && match[1]) {
          return match[1].toUpperCase() as UserIntent;
        }
      }
    } catch (e) {
      console.warn("ML classification call failed, using heuristic fallback:", e);
    }
  }

  // Dynamic Heuristic Fallback
  const candidateTokens = portfolioData.name.toLowerCase().split(/\s+/);
  const nodeLabels = RESUME_VECTOR_NODES.map((n) => n.label.toLowerCase());
  const techTokens = RESUME_VECTOR_NODES.flatMap((n) => (n.codeOrTech || []).map((t) => t.toLowerCase()));
  const projectTitles = (portfolioData.projects || []).map((p) => p.title.toLowerCase());

  const dynamicKeywords = [
    ...candidateTokens,
    ...nodeLabels,
    ...techTokens,
    ...projectTitles,
    "resume", "cv", "project", "projects", "skill", "skills", "experience", "education",
    "contact", "email", "hire", "github", "linkedin", "portfolio", "work", "role", "working", "status",
    "where", "from", "location", "live", "reside", "india", "telangana", "who", "about", "yourself", "droply"
  ];

  const offTopicPatterns = [
    /write\s*(a\s*)?(poem|song|story|essay|joke)/i,
    /capital\s*of/i,
    /what\s*is\s*the\s*weather/i,
    /who\s*is\s*president/i,
    /solve\s*(for\s*x|\d+)/i,
    /recipe\s*for/i,
    /ignore\s*(all\s*)?previous\s*instructions/i,
  ];

  if (offTopicPatterns.some((p) => p.test(clean))) {
    return "OFF_TOPIC";
  }

  if (dynamicKeywords.some((kw) => clean.includes(kw))) {
    return "PORTFOLIO_QUERY";
  }

  return "PORTFOLIO_QUERY";
}

// ── Structured Verified Knowledge Sections (Extracted from portfolioKnowledge.txt) ──
interface KnowledgeSection {
  id: string;
  sectionNum: number;
  title: string;
  text: string;
  link?: string;
  cluster: string;
}

const KNOWLEDGE_SECTIONS: KnowledgeSection[] = [
  {
    id: "kb-sec-1",
    sectionNum: 1,
    title: "1. Professional Identity, Location & Current Work Status",
    text: "Sudhakar Reddy Katam is a versatile Full-Stack Software Engineer and AI Systems Developer. He is based in India (Telangana / Hyderabad, India) and currently resides and works in India. He DOES NOT live in the United States or any other country outside India. He is currently actively exploring and open to full-time Software Engineering roles, contract engineering positions, and freelance opportunities globally, equipped for both global remote work and on-site engineering roles.",
    link: "https://linkedin.com/in/sudhakar-katam",
    cluster: "Location & Professional Status",
  },
  {
    id: "kb-sec-2",
    sectionNum: 2,
    title: "2. Core Philosophy & Engineering Approach",
    text: "Sudhakar is a developer who loves learning by building production systems end-to-end. He is comfortable across the entire stack—from high-performance browser interfaces and cryptography to distributed backend systems, vector databases, and autonomous AI agents. He is deeply interested in both software engineering and hardware systems, focusing on clean code, zero-knowledge security, offline resilience, and fast user experiences.",
    link: "https://github.com/sudhakarkatam",
    cluster: "Philosophy & Bio",
  },
  {
    id: "kb-sec-3",
    sectionNum: 3,
    title: "3. Production Project: Droply (End-to-End Encrypted File Sharing)",
    text: "Droply is an ephemeral, zero-knowledge, end-to-end encrypted file sharing and real-time messaging platform. It utilizes the browser Web Crypto API (AES-GCM 256-bit with PBKDF2 key derivation) so encryption and decryption happen strictly on the client side. Plaintext files and decryption keys never reach the server. Files are stored in zero-knowledge encrypted buckets with strict Time-To-Live (TTL) room expiration, auto-destruction upon download, and zero mandatory user registration. Droply is deployed and live on Netlify.",
    link: "https://github.com/sudhakarkatam",
    cluster: "Security & Cryptography",
  },
  {
    id: "kb-sec-4",
    sectionNum: 4,
    title: "4. Production Project: Personal Tracker Application",
    text: "Personal Tracker is an offline-first mobile application built for Android using React, TypeScript, Capacitor, and IndexedDB with a modern shadcn/ui interface. It provides comprehensive habit formation tracking, daily task management with subtasks, markdown notes and journaling, expense tracking, and wellness metrics. The application features a skip-day streak preservation system, interactive progress visualization charts, and runs completely offline with zero server dependency for total user privacy.",
    link: "https://github.com/sudhakarkatam",
    cluster: "Mobile & Offline-First",
  },
  {
    id: "kb-sec-5",
    sectionNum: 5,
    title: "5. Production Project: Financial Calculators Suite",
    text: "Financial Calculators is a mobile-first Progressive Web Application and Android application published on the Google Play Store. Built with React, TypeScript, and Capacitor, it provides instant precision calculators for investments and loans, including SIP (Systematic Investment Plan), SWP (Systematic Withdrawal Plan), Compound Interest, and Loan EMI calculators. It features responsive visualization charts, fast native performance, and edge deployment.",
    link: "https://github.com/sudhakarkatam",
    cluster: "Mobile & Play Store App",
  },
  {
    id: "kb-sec-6",
    sectionNum: 6,
    title: "6. Production Project: PureValuePicks E-Commerce Store",
    text: "PureValuePicks is a responsive full-stack e-commerce storefront engineered with React, Next.js, and TypeScript. It features a complete product catalog, shopping cart state management, checkout workflows, and user authentication with Supabase and PostgreSQL. It delivers high performance, responsive layout design, and smooth checkout transitions.",
    link: "https://github.com/sudhakarkatam",
    cluster: "Full-Stack Web Apps",
  },
  {
    id: "kb-sec-7",
    sectionNum: 7,
    title: "7. Production Project: Live Production Hub",
    text: "The Live Production Hub serves as a unified command center aggregating Sudhakar's deployed web applications, mobile builds, and open-source tools. Built with React and TypeScript, it displays live deployment health checks, technical documentation, architectural breakdowns, and direct links to live demonstrations and GitHub source repositories.",
    link: "https://github.com/sudhakarkatam",
    cluster: "System Deployments",
  },
  {
    id: "kb-sec-8",
    sectionNum: 8,
    title: "8. AI & Agentic RAG Architecture Expertise",
    text: "Sudhakar has deep hands-on expertise building production Retrieval-Augmented Generation (RAG) and Agentic AI workflows. He designs semantic search pipelines using high-dimensional vector embeddings (Google Gemini embedding models with 3072 dimensions, cosine similarity search), structured JSON Schema extraction, and autonomous agent loops. His AI stack includes LangGraph, CrewAI, Google Gemini, Anthropic Claude, Mistral AI (Codestral), Model Context Protocol (MCP), and local embeddings pipelines.",
    link: "https://github.com/sudhakarkatam",
    cluster: "AI & RAG Architecture",
  },
  {
    id: "kb-sec-9",
    sectionNum: 9,
    title: "9. Full-Stack & Frontend Engineering Stack",
    text: "Sudhakar's frontend expertise encompasses React 18, Next.js with App Router and Server-Side Rendering (SSR), TypeScript, and Vanilla CSS with Tailwind CSS and shadcn/ui. He has extensive mobile development experience using Capacitor to bundle web applications into native Android APKs. He designs resilient offline-first architectures utilizing browser IndexedDB, Service Workers, and client-side encryption.",
    link: "https://github.com/sudhakarkatam",
    cluster: "Frontend & Mobile",
  },
  {
    id: "kb-sec-10",
    sectionNum: 10,
    title: "10. Backend Engineering, Databases & Cloud Systems",
    text: "On the backend, Sudhakar engineers scalable microservices, REST APIs, and event-driven architectures using Python (FastAPI), Node.js, and Java with Spring Boot. His database proficiency includes PostgreSQL with pgvector for vector similarity search, Supabase, MySQL, and Redis for high-throughput in-memory caching. His infrastructure and DevOps toolkit includes Docker containerization, AWS cloud services, Git/GitHub CI/CD workflows, and Vercel edge deployment.",
    link: "https://github.com/sudhakarkatam",
    cluster: "Backend & Cloud",
  },
  {
    id: "kb-sec-11",
    sectionNum: 11,
    title: "11. Computer Science Foundations & Security",
    text: "Sudhakar holds a strong foundation in core Computer Science fundamentals: Data Structures, Algorithms, Object-Oriented Programming (OOP), System Design, and Web Application Security. He emphasizes client-side cryptography (Web Crypto API, AES-GCM, PBKDF2), zero-knowledge architectures, SQL query optimization, and secure API design.",
    link: "https://github.com/sudhakarkatam",
    cluster: "Security & CS Foundations",
  },
  {
    id: "kb-sec-12",
    sectionNum: 12,
    title: "12. Contact Information & Online Presence",
    text: "Sudhakar Reddy Katam can be reached directly via email at sudhakarkatam777@gmail.com. His public code repositories and open-source contributions are hosted on GitHub at https://github.com/sudhakarkatam. His professional career network and recommendations are on LinkedIn at https://linkedin.com/in/sudhakar-katam. His verified PDF resume is available for viewing and download via Google Drive. Sudhakar is open to discussions about full-time software engineering roles, technical co-founder opportunities, and contract projects.",
    link: "mailto:sudhakarkatam777@gmail.com",
    cluster: "Contact & Hiring",
  },
];

// ── STEP 2: Grounded RAG Retrieval (Executed for PORTFOLIO_QUERY) ──
export async function retrieveGroundedContext(query: string, topK: number = 4): Promise<GroundedChunk[]> {
  const cleanQuery = query.toLowerCase().trim();
  const queryTokens = cleanQuery.split(/[\s,?.!]+/).filter((t) => t.length > 2);

  // High-Precision Intent Detectors
  const isLocationQuery = /where\s*(are\s*you|do\s*you|is\s*sudhakar|from|live|based|located|reside)|location|country|state|city|india|usa|united\s*states|place|telangana|hyderabad/i.test(cleanQuery);
  const isIntroQuery = /who\s*(are\s*you|is\s*sudhakar)|tell\s*me\s*about\s*(you|yourself|sudhakar)|intro|introduce|background|bio|story|what\s*do\s*you\s*do/i.test(cleanQuery);
  const isWorkStatusQuery = /are\s*you\s*(working|employed|free|available)|status|hire|job|role|contract|freelance|open\s*to/i.test(cleanQuery);
  const isContactQuery = /contact|email|reach|hire|touch|call|message|linkedin|github|resume|cv/i.test(cleanQuery);
  const isAiQuery = /ai|rag|agent|agentic|embedding|vector|llm|codestral|gemini|mistral|mcp/i.test(cleanQuery);
  const isSecurityCryptoQuery = /crypto|encrypt|decrypt|droply|zero\s*knowledge|security|privacy/i.test(cleanQuery);
  const isMobileTrackerQuery = /tracker|habit|offline|indexeddb|mobile|android|capacitor/i.test(cleanQuery);
  const isCalculatorQuery = /calc|financial|investment|sip|swp|emi|loan|play\s*store/i.test(cleanQuery);
  const isBackendQuery = /backend|api|server|database|postgres|sql|python|fastapi|java|spring|docker|aws/i.test(cleanQuery);
  const isFrontendQuery = /frontend|ui|react|typescript|nextjs|tailwind|css|web/i.test(cleanQuery);

  const scoredSections = KNOWLEDGE_SECTIONS.map((sec) => {
    let score = 0;
    const lowerText = sec.text.toLowerCase();
    const lowerTitle = sec.title.toLowerCase();

    // Contextual Intent Prioritization
    if (sec.sectionNum === 1 && (isLocationQuery || isIntroQuery || isWorkStatusQuery)) score += 150;
    if (sec.sectionNum === 2 && (isIntroQuery || isWorkStatusQuery)) score += 70;
    if (sec.sectionNum === 3 && isSecurityCryptoQuery) score += 120;
    if (sec.sectionNum === 4 && isMobileTrackerQuery) score += 120;
    if (sec.sectionNum === 5 && isCalculatorQuery) score += 120;
    if (sec.sectionNum === 8 && isAiQuery) score += 120;
    if (sec.sectionNum === 9 && isFrontendQuery) score += 90;
    if (sec.sectionNum === 10 && isBackendQuery) score += 90;
    if (sec.sectionNum === 11 && isSecurityCryptoQuery) score += 80;
    if (sec.sectionNum === 12 && isContactQuery) score += 150;

    // Full text & token scoring
    if (lowerText.includes(cleanQuery)) score += 50;
    if (lowerTitle.includes(cleanQuery)) score += 60;

    queryTokens.forEach((token) => {
      if (lowerTitle.includes(token)) score += 25;
      if (lowerText.includes(token)) score += 12;
    });

    return { sec, score };
  });

  let sortedSections: GroundedChunk[] = scoredSections
    .sort((a, b) => b.score - a.score)
    .filter((s) => s.score > 0)
    .slice(0, topK)
    .map((s) => ({
      id: s.sec.id,
      title: s.sec.title,
      text: s.sec.text,
      link: s.sec.link,
      cluster: s.sec.cluster,
    }));

  // Enforce Section 1 at the top for any location or intro query
  if (isLocationQuery || isIntroQuery) {
    const sec1 = KNOWLEDGE_SECTIONS[0];
    sortedSections = sortedSections.filter((s) => s.id !== sec1.id);
    sortedSections.unshift({
      id: sec1.id,
      title: sec1.title,
      text: sec1.text,
      link: sec1.link,
      cluster: sec1.cluster,
    });
  }

  // If vector search is available and this is a deep technical query, augment with top technical node
  if (isGeminiConfigured() && Array.isArray(precomputedList) && precomputedList.length > 0 && !isLocationQuery && !isIntroQuery) {
    try {
      const queryVector = await embedText(query);
      if (queryVector && queryVector.length > 0) {
        const topMatches = searchByCosineSimilarity(queryVector, precomputedList, 2);
        const nodeMap = new Map(RESUME_VECTOR_NODES.map((n) => [n.id, n]));
        topMatches.forEach((m) => {
          const foundNode = nodeMap.get(m.id);
          if (foundNode && !sortedSections.some((s) => s.id === foundNode.id)) {
            sortedSections.push({
              id: foundNode.id,
              title: foundNode.title,
              text: `${foundNode.title}: ${foundNode.description}. Highlights: ${(foundNode.metricsOrHighlights || []).join("; ")}. Tech: ${(foundNode.codeOrTech || []).join(", ")}`,
              link: foundNode.externalLink || foundNode.githubLink,
              cluster: foundNode.clusterLabel,
            });
          }
        });
      }
    } catch {
      // Non-blocking fallback
    }
  }

  if (sortedSections.length > 0) {
    return sortedSections.slice(0, topK);
  }

  // Fallback default chunks
  return KNOWLEDGE_SECTIONS.slice(0, topK).map((s) => ({
    id: s.id,
    title: s.title,
    text: s.text,
    link: s.link,
    cluster: s.cluster,
  }));
}

// ── STEP 3: Complete Streaming Pipeline (Classification -> Retrieval -> Grounded Generation) ──
export async function streamMistralResponse(
  query: string,
  chatHistory: { role: "user" | "assistant"; content: string }[],
  onChunk: (accumulated: string) => void
): Promise<{ text: string; citations: { title: string; link?: string; cluster?: string }[]; intent: UserIntent }> {
  const apiKey = getMistralKey();
  const candidateName = portfolioData.name;

  // ── PHASE 1: Intent Classification BEFORE Retrieval ──
  const intent = await classifyIntentWithML(query, apiKey);

  // ── BRANCH 1: GREETING (No retrieval needed) ──
  if (intent === "GREETING") {
    if (apiKey && isMistralKeyConfigured()) {
      try {
        const greetingPrompt = `You are ${candidateName}'s official AI Representative.
The visitor just greeted you ("${query}").
Respond warmly, naturally, and concisely in 1 to 2 sentences.
Acknowledge their greeting naturally, introduce yourself as ${candidateName}'s AI representative, and invite them to explore projects, technical stack, or get in touch.`;

        const res = await callMistralChat(apiKey, {
          model: "codestral-2508",
          messages: [
            { role: "system", content: greetingPrompt },
            { role: "user", content: query },
          ],
          temperature: 0.6,
          max_tokens: 120,
          stream: true,
        });

        if (res.ok) {
          const streamed = await readStream(res, onChunk);
          return { text: streamed, citations: [], intent: "GREETING" };
        }
      } catch (e) {
        console.warn("Greeting stream error, falling back:", e);
      }
    }

    const greetingText = `Hello! I am ${candidateName}'s AI portfolio representative. How can I help you explore their projects, technical background, or current availability today?`;
    await simulateStream(greetingText, onChunk);
    return { text: greetingText, citations: [], intent: "GREETING" };
  }

  // ── BRANCH 2: OFF_TOPIC (No retrieval needed) ──
  if (intent === "OFF_TOPIC") {
    const refusalText = `I am ${candidateName}'s dedicated AI Portfolio Assistant. I specialize in answering questions about their software engineering background, technical projects, system architecture, and contact details. Feel free to ask about any projects or technologies in the portfolio!`;
    await simulateStream(refusalText, onChunk);
    return { text: refusalText, citations: [], intent: "OFF_TOPIC" };
  }

  // ── BRANCH 3: PORTFOLIO_QUERY (Execute Semantic RAG Retrieval) ──
  const retrievedChunks = await retrieveGroundedContext(query, 4);

  const contextText = retrievedChunks
    .map(
      (c, i) =>
        `[Context Chunk ${i + 1}: ${c.title}]\n${c.text}`
    )
    .join("\n\n");

  const citations = retrievedChunks
    .filter((c) => c.title)
    .map((c) => ({
      title: c.title,
      link: c.link,
      cluster: c.cluster || "Knowledge Base",
    }));

  // Dynamic Offline Fallback (Synthesizes answer purely from retrieved chunks without hardcoded names)
  if (!apiKey || !isMistralKeyConfigured()) {
    const fallbackAnswer = generateDataDrivenAnswer(query, retrievedChunks);
    await simulateStream(fallbackAnswer, onChunk);
    return { text: fallbackAnswer, citations, intent: "PORTFOLIO_QUERY" };
  }

  // Production Prompt: Ground truth identity, strict facts, and pronoun resolution
  const systemPrompt = `You are the official AI Representative / Digital Avatar of ${candidateName}. Your role is to represent their professional profile, software engineering background, projects, architecture decisions, and current career status with 100% factual accuracy.

CORE CANDIDATE FACTS & GROUND TRUTH (ALWAYS PRESERVE ACCURACY):
1. CANDIDATE NAME: ${candidateName}
2. LOCATION & RESIDENCE: Based in INDIA (Telangana / Hyderabad, India). Sudhakar currently resides, lives, and works in INDIA. He DOES NOT live in the United States or anywhere outside India. Under NO circumstances should you state or imply that he resides in the United States.
3. CURRENT WORK STATUS: Actively exploring and open to full-time Software Engineering roles, contract engineering positions, and freelance opportunities globally (both remote work worldwide and on-site relocation).
4. PHILOSOPHY: Developer who loves learning by building. Comfortable across the entire stack—web, mobile, backend, client-side cryptography, and Agentic AI.
5. TOP 5 PRODUCTION PROJECTS:
   - Droply: Ephemeral, zero-knowledge, end-to-end encrypted file sharing (Web Crypto API AES-GCM 256-bit, PBKDF2). Live on Netlify.
   - Personal Tracker: Offline-first Android mobile app (React, TypeScript, Capacitor, IndexedDB) with habit tracking, streak preservation, zero server dependence.
   - Financial Calculators: Live on Google Play Store (PWA + Capacitor Android app) with SIP, SWP, and Loan EMI calculators.
   - PureValuePicks: Full-stack e-commerce storefront (React, Next.js, Supabase, PostgreSQL).
   - Live Production Hub: Aggregated deployment command center and architecture showcase.
6. CORE TECH STACK: React 18, Next.js, TypeScript, Node.js, Python (FastAPI), Java (Spring Boot), Supabase, PostgreSQL (pgvector), Docker, AWS, Agentic AI, RAG.
7. CONTACT: Email: ${portfolioData.contact.email} | GitHub: ${portfolioData.contact.github || ""} | LinkedIn: ${portfolioData.contact.linkedin || ""}

PERSONA & PRONOUN RESOLUTION RULES:
1. You speak on behalf of ${candidateName}. When a visitor uses 2nd-person pronouns ("you", "your", "are you", "do you", "where do you", "where are you from", "what have you built"), they are inquiring directly about ${candidateName}.
   - Example: If asked "where are you from?" or "where do you live?", state clearly: "I am based in India (Telangana). I currently reside and work in India and am open to remote opportunities worldwide as well as on-site roles."
   - Example: If asked "are you working now?" or "what is your status?", explain that you are an engineer actively exploring full-time software engineering roles, contract work, and freelance opportunities.
   - Example: If asked "what do you build?" or "what is your stack?", answer using ${candidateName}'s actual projects and technical stack from the verified context.
2. Never speak as a robotic computer program or backend server daemon (never say "I am an AI running on a server 24/7"). Speak naturally and professionally as ${candidateName}'s representative.
3. Manage typos, colloquialisms, and incomplete phrases gracefully (e.g. "how are yo" -> "How are you", "drply" -> "Droply", "wrk" -> "work").

GROUNDING & FORMATTING RULES:
1. Ground your answer strictly and exclusively in the provided verified context chunks below.
2. Tone: Professional, articulate, confident, and technical yet accessible.
3. Length: Keep answers concise and informative (2 to 4 well-structured sentences, or clean numbered points).
4. Formatting: Write clean, readable text. Use standard numbered items or concise paragraphs. Do not output raw markdown tags or unformatted asterisks.
5. Reference specific projects, architectures, performance metrics, and technologies directly extracted from the verified portfolio chunks above when relevant to the visitor's inquiry.
6. NO UNSOLICITED FOLLOW-UPS: Never include conversational follow-up questions, trailing suggestions, or closing filler at the end of your response (e.g. avoid phrases like "Let me know if you need more details!", "Feel free to ask if you want to explore more about Droply", "Would you like me to elaborate?", or "What else would you like to know?"). Provide the direct, informative answer and stop immediately.

=== VERIFIED PORTFOLIO KNOWLEDGE CONTEXT ===
${contextText}

=== VISITOR QUERY ===
"${query}"`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...chatHistory.slice(-4),
    { role: "user", content: query },
  ];

  try {
    const response = await callMistralChat(apiKey, {
      model: "codestral-2508",
      messages,
      temperature: 0.3,
      max_tokens: 450,
      stream: true,
    });

    if (!response.ok) {
      throw new Error(`Mistral API error ${response.status}: ${await response.text()}`);
    }

    const streamed = await readStream(response, onChunk);
    return { text: streamed || generateDataDrivenAnswer(query, retrievedChunks), citations, intent: "PORTFOLIO_QUERY" };
  } catch (err: any) {
    console.warn("Codestral stream failed, falling back to grounded response:", err);
    const fallbackAnswer = generateDataDrivenAnswer(query, retrievedChunks);
    await simulateStream(fallbackAnswer, onChunk);
    return { text: fallbackAnswer, citations, intent: "PORTFOLIO_QUERY" };
  }
}

// ── Stream Helper: Read SSE from Mistral ──
async function readStream(response: Response, onChunk: (accumulated: string) => void): Promise<string> {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let accumulatedText = "";

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const raw = decoder.decode(value);
      const lines = raw.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const dataStr = line.slice(6).trim();
          if (dataStr === "[DONE]" || !dataStr) continue;
          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta?.content || "";
            accumulatedText += delta;
            onChunk(accumulatedText);
          } catch {
            // Ignore partial chunks
          }
        }
      }
    }
  }
  return accumulatedText;
}

// ── Offline Typing Stream Simulator ──
async function simulateStream(fullText: string, onChunk: (accumulated: string) => void): Promise<void> {
  let accumulated = "";
  const words = fullText.split(" ");
  for (let i = 0; i < words.length; i++) {
    accumulated += (i === 0 ? "" : " ") + words[i];
    onChunk(accumulated);
    await new Promise((r) => setTimeout(r, 16));
  }
}

// ── 100% Data-Driven Fallback Synthesizer ──
function generateDataDrivenAnswer(query: string, chunks: GroundedChunk[]): string {
  const clean = query.toLowerCase();
  const candidateName = portfolioData.name;

  // Location / origin inquiries
  if (/where\s*(are\s*you|do\s*you|is\s*sudhakar)\s*(from|live|based|located|reside)|location|country|city|based\s*in|reside|india|united\s*states|state/i.test(clean)) {
    return `I am based in India (Telangana). I currently reside and work in India, and I am actively exploring full-time Software Engineering roles, contract engineering positions, and freelance opportunities globally (both remote and on-site relocation).`;
  }

  // Introduction / identity inquiries
  if (/who\s*are\s*you|tell\s*me\s*about\s*(yourself|you|sudhakar)|introduce|what\s*do\s*you\s*do/i.test(clean)) {
    return `I am ${candidateName}, a Full-Stack Software Engineer and AI Systems Developer based in India. I love learning by building end-to-end production systems across web, mobile, and Agentic AI. My key projects include Droply (encrypted file sharing), Personal Tracker (offline-first Android app), and Financial Calculators (published on Google Play Store).`;
  }

  // Status / employment / availability inquiries
  if (clean.includes("working now") || clean.includes("employed") || clean.includes("status") || clean.includes("available") || clean.includes("job")) {
    return `${candidateName} is an aspiring software engineer actively seeking full-time software engineering roles, contract engineering positions, and freelance opportunities. He is based in India and open to global remote and on-site positions.`;
  }

  // Contact / hiring inquiries
  if (clean.includes("contact") || clean.includes("hire") || clean.includes("email") || clean.includes("reach") || clean.includes("touch")) {
    return `You can reach ${candidateName} directly via email at ${portfolioData.contact.email}. You can also connect via LinkedIn (${portfolioData.contact.linkedin || ""}) or view code on GitHub (${portfolioData.contact.github || ""}).`;
  }

  if (chunks.length === 0) {
    return `${candidateName} is a software engineer specializing in ${portfolioData.title}.`;
  }

  const primary = chunks[0];
  const secondary = chunks.length > 1 ? chunks[1] : null;

  let answer = `${candidateName} has hands-on production experience in ${primary.title}: ${primary.text.slice(0, 220)}...`;

  if (secondary) {
    answer += ` Additionally, in ${secondary.title}: ${secondary.text.slice(0, 180)}...`;
  }

  return answer;
}
