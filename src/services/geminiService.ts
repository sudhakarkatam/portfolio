/**
 * Gemini API Service
 * Handles text embedding (text-embedding-004) and LLM answer generation (gemini-2.0-flash)
 * Uses Vite env variable VITE_GEMINI_API_KEY
 */

const getApiKey = () =>
  (import.meta.env.VITE_GEMINI_API_KEY || (import.meta.env as Record<string, string | undefined>).GEMINI_API_KEY) as string | undefined;

const EMBED_MODEL = "text-embedding-004";
const GENERATE_MODEL = "gemini-2.0-flash";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Generate a 768-dim embedding vector for the given text using Gemini text-embedding-004
 */
export async function embedText(text: string): Promise<number[]> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Gemini API key not configured");

  // Try gemini-embedding-001, text-embedding-004, or embedding-001
  const models = ["gemini-embedding-001", "text-embedding-004", "embedding-001"];

  for (const model of models) {
    try {
      const response = await fetch(
        `${BASE_URL}/${model}:embedContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: `models/${model}`,
            content: { parts: [{ text }] },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.embedding.values as number[];
      }
    } catch {
      // try next model
    }
  }

  throw new Error("Unable to generate embedding with text-embedding-004 or embedding-001.");
}

/**
 * Generate a streamed RAG answer using Gemini gemini-2.0-flash.
 * contextChunks are the top-K retrieved vector nodes used as grounding context.
 * onChunk callback receives the accumulated text as it streams in.
 */
export async function generateAnswer(
  query: string,
  contextChunks: {
    title: string;
    description: string;
    codeOrTech?: string[];
    metricsOrHighlights?: string[];
  }[],
  onChunk: (accumulatedText: string) => void
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Gemini API key not configured");

  // Build RAG context from retrieved chunks
  const context = contextChunks
    .map(
      (chunk, i) =>
        `[${i + 1}] ${chunk.title}: ${chunk.description}${
          chunk.codeOrTech
            ? ` | Technologies: ${chunk.codeOrTech.join(", ")}`
            : ""
        }${
          chunk.metricsOrHighlights
            ? ` | Highlights: ${chunk.metricsOrHighlights.join("; ")}`
            : ""
        }`
    )
    .join("\n\n");

  const systemPrompt = `You are a knowledgeable AI assistant for Sudhakar Reddy Katam's portfolio website. Your role is to answer questions about his skills, projects, experience, and background using ONLY the provided context chunks retrieved via semantic vector search.

Rules:
- Answer concisely and professionally in 2-4 sentences
- Cite sources using [1], [2], etc. matching the context chunk numbers
- If the context doesn't contain relevant information, say so honestly
- Never make up information not present in the context
- Be conversational and helpful`;

  const userPrompt = `Retrieved context chunks (from vector similarity search):\n\n${context}\n\nUser question: ${query}`;

  const response = await fetch(
    `${BASE_URL}/${GENERATE_MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 400,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Generation API error (${response.status}): ${errorText}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim();
        if (data === "[DONE]" || !data) continue;
        try {
          const parsed = JSON.parse(data);
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            fullText += text;
            onChunk(fullText);
          }
        } catch {
          // Skip malformed SSE lines
        }
      }
    }
  }

  return fullText;
}

/**
 * Check if the Gemini API key is configured and non-placeholder
 */
export function isApiKeyConfigured(): boolean {
  const key = getApiKey();
  return !!key && key !== "your_gemini_api_key_here" && key.length > 10;
}
