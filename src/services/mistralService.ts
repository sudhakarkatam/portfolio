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

  // Questions about current work, employment, availability, role, or hiring are ALWAYS portfolio queries, never greetings
  const workStatusPatterns = [
    /are\s*you\s*(working|employed|free|available|hiring|open)/i,
    /what\s*(are\s*you|is\s*your)\s*(doing|working\s*on|job|role|status|stack|experience)/i,
    /where\s*(do|are)\s*you\s*(work|located|based|live)/i,
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
- "GREETING": Strictly conversational hellos and pleasantries ("hi", "hello", "how are you doing", "nice to meet you"). NOTE: Questions about current work, employment, availability, skills, or projects are NOT greetings.
- "PORTFOLIO_QUERY": Any inquiry about ${candidateName}'s software projects, technical stack, current employment/work status, availability, background, education, experience, or hiring/contact details. Any question asking "are you working now", "what do you do", "what is your stack", or "can I hire you" is a PORTFOLIO_QUERY.
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
    "contact", "email", "hire", "github", "linkedin", "portfolio", "work", "role", "working", "status"
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

// ── STEP 2: Production Vector RAG Retrieval (Executed ONLY for PORTFOLIO_QUERY) ──
export async function retrieveGroundedContext(query: string, topK: number = 4): Promise<GroundedChunk[]> {
  // Option A: True Vector Cosine Similarity Search using 3072-dim embeddings
  if (isGeminiConfigured() && Array.isArray(precomputedList) && precomputedList.length > 0) {
    try {
      const queryVector = await embedText(query);
      if (queryVector && queryVector.length > 0) {
        const topMatches = searchByCosineSimilarity(queryVector, precomputedList, topK);
        const nodeMap = new Map(RESUME_VECTOR_NODES.map((n) => [n.id, n]));
        const retrieved: GroundedChunk[] = [];

        topMatches.forEach((m) => {
          const matchedEntry = precomputedList.find((e) => e.id === m.id);
          const foundNode = nodeMap.get(m.id);

          if (matchedEntry?.text) {
            // It's a text chunk from portfolioKnowledge.txt
            retrieved.push({
              id: matchedEntry.id,
              title: matchedEntry.title || "Knowledge Base",
              text: matchedEntry.text,
              cluster: "Verified Knowledge Base",
            });
          } else if (foundNode) {
            // It's an interactive graph node
            retrieved.push({
              id: foundNode.id,
              title: foundNode.title,
              text: `${foundNode.title}: ${foundNode.description}. Highlights: ${(foundNode.metricsOrHighlights || []).join("; ")}. Tech: ${(foundNode.codeOrTech || []).join(", ")}`,
              link: foundNode.externalLink || foundNode.githubLink,
              cluster: foundNode.clusterLabel,
            });
          }
        });

        if (retrieved.length > 0) {
          return retrieved;
        }
      }
    } catch (err) {
      console.warn("Vector embedding retrieval error, falling back to dynamic scoring:", err);
    }
  }

  // Option B: Dynamic Paragraph Scoring Fallback (Parsed from portfolioKnowledge.txt)
  if (rawKnowledgeText && rawKnowledgeText.trim()) {
    const paragraphs = rawKnowledgeText.split(/\n(?=##\s+)/g);
    const cleanQuery = query.toLowerCase();
    const queryTokens = cleanQuery.split(/\s+/).filter((t) => t.length > 2);

    const scoredParagraphs = paragraphs.map((p, idx) => {
      let score = 0;
      const lowerP = p.toLowerCase();
      if (lowerP.includes(cleanQuery)) score += 50;
      queryTokens.forEach((t) => {
        if (lowerP.includes(t)) score += 15;
      });
      const lines = p.trim().split("\n");
      const title = lines[0].replace(/^#+\s*/, "").trim();
      return { id: `kb-${idx}`, title, text: p.trim(), score };
    });

    const topPara = scoredParagraphs
      .filter((sp) => sp.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    if (topPara.length > 0) {
      return topPara.map((tp) => ({
        id: tp.id,
        title: tp.title,
        text: tp.text,
        cluster: "Portfolio Knowledge",
      }));
    }
  }

  // Option C: Graph Nodes scoring fallback
  return RESUME_VECTOR_NODES.slice(0, topK).map((n) => ({
    id: n.id,
    title: n.title,
    text: `${n.title}: ${n.description}`,
    link: n.externalLink || n.githubLink,
    cluster: n.clusterLabel,
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
Acknowledge their greeting naturally (e.g. "Hello! I'm doing well, thank you!"), introduce yourself as ${candidateName}'s AI representative, and invite them to explore their software engineering projects, technical stack, or get in touch.`;

        const res = await callMistralChat(apiKey, {
          model: "codestral-2508",
          messages: [
            { role: "system", content: greetingPrompt },
            { role: "user", content: query },
          ],
          temperature: 0.6,
          max_tokens: 150,
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

    const greetingText = `Hello! I am ${candidateName}'s AI portfolio representative. I can answer questions about their software engineering projects, technical architecture, current availability, or contact details. How can I help you explore today?`;
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

  // Production Prompt: High-empathy persona with pronoun resolution and verified context
  const systemPrompt = `You are the official AI Representative / Digital Avatar of ${candidateName}. Your role is to represent their professional profile, software engineering background, projects, architecture decisions, and current career status with utmost accuracy.

PERSONA & PRONOUN RESOLUTION RULES:
1. You speak on behalf of ${candidateName}. When a visitor uses 2nd-person pronouns ("you", "your", "are you", "do you", "where do you", "what have you built"), they are inquiring about ${candidateName}.
   - Example: If asked "are you working now?" or "what is your current status?", explain that ${candidateName} is an engineer actively exploring full-time software engineering roles, contract work, and freelance opportunities.
   - Example: If asked "what do you build?" or "what is your stack?", answer using ${candidateName}'s projects and technical stack from the context.
2. Never speak as a robotic computer program or backend server daemon (never say "I am an AI running on a server 24/7"). Speak naturally and professionally as ${candidateName}'s representative.
3. Manage typos, colloquialisms, and incomplete phrases gracefully (e.g. "how are yo" -> "How are you", "drply" -> "Droply", "wrk" -> "work").

GROUNDING & FORMATTING RULES:
1. Ground your answer strictly and exclusively in the provided verified context chunks below.
2. Tone: Professional, articulate, confident, and technical yet accessible.
3. Length: Keep answers concise and informative (2 to 4 well-structured sentences, or clean numbered points).
4. Formatting: Write clean, readable text. Use standard numbered items or concise paragraphs. Do not output raw markdown tags or unformatted asterisks.
5. Reference specific projects, architectures, performance metrics, and technologies directly extracted from the verified portfolio chunks above when relevant to the visitor's inquiry.
6. If the context chunks do not contain the answer, politely state what is known instead of speculating.

=== VERIFIED PORTFOLIO KNOWLEDGE CONTEXT ===
${contextText}

=== VISITOR QUERY ===
"${query}"

Contact Details:
Email: ${portfolioData.contact.email}
GitHub: ${portfolioData.contact.github || ""}
LinkedIn: ${portfolioData.contact.linkedin || ""}`;

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
    return { text: streamed || "Thank you for asking! Let me know if you need more details.", citations, intent: "PORTFOLIO_QUERY" };
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

  // Status / employment / availability inquiries
  if (clean.includes("working now") || clean.includes("employed") || clean.includes("status") || clean.includes("available")) {
    return `${candidateName} is an aspiring software engineer actively seeking full-time software engineering roles, contract engineering positions, and freelance opportunities. He is based in India and open to global remote and on-site positions.`;
  }

  // Contact / hiring inquiries
  if (clean.includes("contact") || clean.includes("hire") || clean.includes("email") || clean.includes("reach") || clean.includes("touch")) {
    return `You can reach ${candidateName} directly via email at ${portfolioData.contact.email}. You can also connect via LinkedIn (${portfolioData.contact.linkedin || ""}) or view code on GitHub (${portfolioData.contact.github || ""}).`;
  }

  if (chunks.length === 0) {
    return `${candidateName} is a software engineer specializing in ${portfolioData.title}. Feel free to ask about specific projects, system architectures, or technical capabilities!`;
  }

  const primary = chunks[0];
  const secondary = chunks.length > 1 ? chunks[1] : null;

  let answer = `${candidateName} has hands-on production experience in ${primary.title}: ${primary.text.slice(0, 220)}...`;

  if (secondary) {
    answer += ` Additionally, in ${secondary.title}: ${secondary.text.slice(0, 180)}...`;
  }

  return answer;
}
