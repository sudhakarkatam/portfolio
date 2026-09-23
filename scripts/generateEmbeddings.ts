/**
 * Build-time script: Generate Gemini embeddings for:
 * 1. Plain-text knowledge base: `src/data/portfolioKnowledge.txt` (paragraph chunks with overlap)
 * 2. Graph vector nodes: `src/data/resumeVectorData.ts` (for the interactive graph)
 * 
 * Usage:
 *   npx tsx scripts/generateEmbeddings.ts
 *   or: npm run generate:embeddings
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { RESUME_VECTOR_NODES } from "../src/data/resumeVectorData";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Load .env file manually ──
function loadEnvFile(): void {
  const envPath = path.resolve(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex > 0) {
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!API_KEY || API_KEY === "your_gemini_api_key_here") {
  console.error("❌ VITE_GEMINI_API_KEY / GEMINI_API_KEY not set or placeholder in .env");
  process.exit(1);
}

// ── Auto-Detect Supported Embedding Model ──
interface EmbeddingEndpointConfig {
  apiVersion: string;
  modelName: string;
}

async function findWorkingEndpoint(apiKey: string): Promise<EmbeddingEndpointConfig> {
  console.log("🔍 Checking available Gemini embedding models for your API key...");

  const candidates: EmbeddingEndpointConfig[] = [
    { apiVersion: "v1beta", modelName: "gemini-embedding-001" },
    { apiVersion: "v1", modelName: "gemini-embedding-001" },
    { apiVersion: "v1beta", modelName: "text-embedding-004" },
    { apiVersion: "v1beta", modelName: "embedding-001" },
  ];

  try {
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    if (listRes.ok) {
      const listData = await listRes.json();
      const embedModels = (listData.models || []).filter((m: any) =>
        m.supportedGenerationMethods?.includes("embedContent")
      );
      if (embedModels.length > 0) {
        console.log(`   Found ${embedModels.length} models supporting embedContent:`);
        embedModels.forEach((m: any) => console.log(`   • ${m.name}`));

        const preferred =
          embedModels.find((m: any) => m.name.includes("gemini-embedding-001")) ||
          embedModels.find((m: any) => m.name.includes("text-embedding-004")) ||
          embedModels[0];
        const rawName = preferred.name.replace(/^models\//, "");
        return { apiVersion: "v1beta", modelName: rawName };
      }
    }
  } catch {
    // Probe candidates
  }

  for (const candidate of candidates) {
    try {
      const url = `https://generativelanguage.googleapis.com/${candidate.apiVersion}/models/${candidate.modelName}:embedContent?key=${apiKey}`;
      const probe = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: `models/${candidate.modelName}`,
          content: { parts: [{ text: "test" }] },
        }),
      });

      if (probe.ok) {
        console.log(`✅ Selected working model: [${candidate.modelName}] (${candidate.apiVersion})\n`);
        return candidate;
      }
    } catch {
      // Continue
    }
  }

  return { apiVersion: "v1beta", modelName: "gemini-embedding-001" };
}

async function embedText(
  text: string,
  endpoint: EmbeddingEndpointConfig,
  apiKey: string
): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/${endpoint.apiVersion}/models/${endpoint.modelName}:embedContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${endpoint.modelName}`,
      content: { parts: [{ text }] },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  if (!data?.embedding?.values) {
    throw new Error(`Malformed embedding response: ${JSON.stringify(data)}`);
  }

  return data.embedding.values as number[];
}

// ── Paragraph Chunker with Overlap for Plain Text Knowledge Base ──
interface KnowledgeChunk {
  id: string;
  title: string;
  text: string;
  type: "text_chunk";
  embedding?: number[];
}

function chunkKnowledgeText(content: string, overlapChars: number = 100): KnowledgeChunk[] {
  // Split on markdown headers "## " or double-newlines
  const sections = content.split(/\n(?=##\s+)/g);
  const chunks: KnowledgeChunk[] = [];
  let previousTail = "";

  sections.forEach((sec, idx) => {
    const trimmed = sec.trim();
    if (!trimmed) return;

    const lines = trimmed.split("\n");
    const firstLine = lines[0].replace(/^#+\s*/, "").trim();
    const bodyLines = lines.slice(1).join("\n").trim();
    const coreText = bodyLines || trimmed;

    // Attach sliding window overlap from preceding section
    const fullChunkText = previousTail
      ? `[Context Overlap: ${previousTail}]\n${coreText}`
      : coreText;

    chunks.push({
      id: `kb-chunk-${idx + 1}`,
      title: firstLine,
      text: fullChunkText,
      type: "text_chunk",
    });

    // Capture trailing characters for the next chunk's overlap
    if (coreText.length > overlapChars) {
      previousTail = coreText.slice(-overlapChars).trim();
    } else {
      previousTail = coreText;
    }
  });

  return chunks;
}

function buildNodeText(node: (typeof RESUME_VECTOR_NODES)[0]): string {
  const parts = [
    node.title,
    node.subtitle,
    node.description,
    ...(node.semanticTags || []),
    ...(node.codeOrTech || []),
    ...(node.metricsOrHighlights || []),
    ...(node.featuresOrLearnings || []),
  ];
  return parts.filter(Boolean).join(". ");
}

async function main() {
  const endpoint = await findWorkingEndpoint(API_KEY);

  // ── 1. Read and Chunk portfolioKnowledge.txt ──
  const txtPath = path.resolve(__dirname, "..", "src", "data", "portfolioKnowledge.txt");
  let kbChunks: KnowledgeChunk[] = [];

  if (fs.existsSync(txtPath)) {
    const txtContent = fs.readFileSync(txtPath, "utf-8");
    kbChunks = chunkKnowledgeText(txtContent, 120);
    console.log(`📄 Loaded [portfolioKnowledge.txt]: generated ${kbChunks.length} paragraph chunks with overlap.`);
  } else {
    console.warn("⚠️ portfolioKnowledge.txt not found. Proceeding with graph nodes only.");
  }

  console.log(`\n🧠 Generating Gemini embeddings using [${endpoint.modelName}]...\n`);

  const embeddings: Array<{
    id: string;
    title?: string;
    text?: string;
    type?: string;
    cluster?: string;
    embedding: number[];
  }> = [];

  // ── A. Embed Plain-Text Knowledge Chunks ──
  if (kbChunks.length > 0) {
    console.log(`--- Embedding ${kbChunks.length} Knowledge Base Paragraph Chunks ---`);
    for (let i = 0; i < kbChunks.length; i++) {
      const chunk = kbChunks[i];
      process.stdout.write(
        `  [${String(i + 1).padStart(2)}/${kbChunks.length}] ${chunk.title.slice(0, 35).padEnd(35)}`
      );

      try {
        const rawEmbedding = await embedText(chunk.text, endpoint, API_KEY);
        const rounded = rawEmbedding.map((v) => Math.round(v * 100000) / 100000);
        embeddings.push({
          id: chunk.id,
          title: chunk.title,
          text: chunk.text,
          type: "text_chunk",
          embedding: rounded,
        });
        console.log("✅");
      } catch (err: any) {
        console.log("❌");
        console.error(`     Error: ${err.message || err}`);
      }

      await new Promise((r) => setTimeout(r, 150));
    }
  }

  // ── B. Embed Graph Vector Nodes (For Obsidian Graph & Node Search) ──
  console.log(`\n--- Embedding ${RESUME_VECTOR_NODES.length} Interactive Graph Nodes ---`);
  for (let i = 0; i < RESUME_VECTOR_NODES.length; i++) {
    const node = RESUME_VECTOR_NODES[i];
    const text = buildNodeText(node);

    process.stdout.write(
      `  [${String(i + 1).padStart(2)}/${RESUME_VECTOR_NODES.length}] ${node.label.padEnd(35)}`
    );

    try {
      const rawEmbedding = await embedText(text, endpoint, API_KEY);
      const rounded = rawEmbedding.map((v) => Math.round(v * 100000) / 100000);
      embeddings.push({
        id: node.id,
        title: node.title,
        cluster: node.cluster,
        type: "graph_node",
        embedding: rounded,
      });
      console.log("✅");
    } catch (err: any) {
      console.log("❌");
      console.error(`     Error: ${err.message || err}`);
    }

    if (i < RESUME_VECTOR_NODES.length - 1) {
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  // ── 3. Save Output ──
  const outputPath = path.resolve(__dirname, "..", "src", "data", "precomputedEmbeddings.json");
  fs.writeFileSync(outputPath, JSON.stringify(embeddings, null, 2));

  const fileSizeKB = (fs.statSync(outputPath).size / 1024).toFixed(1);
  console.log(`\n🎉 Saved ${embeddings.length} total embeddings to src/data/precomputedEmbeddings.json (${fileSizeKB} KB)`);
  console.log(`   Dimensions: ${embeddings[0]?.embedding.length || 0} per vector\n`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
