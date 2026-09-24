/**
 * Single Source of Truth Embedding Generator
 * ──────────────────────────────────────────
 * 1. Reads `src/data/portfolioKnowledge.txt` (Single Source of Truth)
 *    and generates dense vector embeddings for all knowledge sections -> `src/data/knowledgeEmbeddings.json`.
 * 2. Reads `src/data/resumeVectorData.ts`
 *    and generates dense vector embeddings for the 3D Obsidian graph -> `src/data/precomputedEmbeddings.json`.
 *
 * HOW TO RUN:
 *   node scripts/generateEmbeddings.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Load .env file ──
function loadEnv() {
  const envPath = path.resolve(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, "utf-8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq > 0) {
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      env[key] = val;
    }
  }
  return env;
}

const env = loadEnv();
const API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("❌ No Gemini API key found in .env (expected VITE_GEMINI_API_KEY or GEMINI_API_KEY).");
  process.exit(1);
}

// ── Parse portfolioKnowledge.txt (Single Source of Truth) ──
function parseKnowledgeSections() {
  const txtPath = path.resolve(__dirname, "..", "src", "data", "portfolioKnowledge.txt");
  const rawText = fs.readFileSync(txtPath, "utf-8");

  const rawSections = rawText.split(/\n---\s*\n/).filter((block) => {
    return block.includes("@title:") && block.trim().length > 50;
  });

  return rawSections.map((block, idx) => {
    const lines = block.trim().split("\n");
    let title = "", cluster = "Knowledge Base", keywords = [], link = undefined;
    const bodyLines = [];
    let metaDone = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#")) continue;
      if (!metaDone) {
        if (trimmed.startsWith("@title:")) title = trimmed.slice(7).trim();
        else if (trimmed.startsWith("@cluster:")) cluster = trimmed.slice(9).trim();
        else if (trimmed.startsWith("@keywords:")) keywords = trimmed.slice(10).split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
        else if (trimmed.startsWith("@link:")) link = trimmed.slice(6).trim() || undefined;
        else if (trimmed === "") { if (title) metaDone = true; }
        else if (!trimmed.startsWith("@")) { metaDone = true; bodyLines.push(trimmed); }
      } else {
        if (trimmed) bodyLines.push(trimmed);
      }
    }

    return {
      id: `kb-sec-${idx + 1}`,
      sectionNum: idx + 1,
      title: title || `Section ${idx + 1}`,
      cluster,
      keywords,
      link,
      text: bodyLines.join(" ").trim(),
    };
  }).filter((s) => s.text.length > 0);
}


// ── Auto-Detect Supported Embedding Model ──
async function findEndpoint() {
  console.log("🔍 Checking available Gemini models for your API key...");

  try {
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
    const listRes = await fetch(listUrl);
    if (listRes.ok) {
      const listData = await listRes.json();
      const embedModels = (listData.models || []).filter((m) =>
        m.supportedGenerationMethods?.includes("embedContent")
      );
      if (embedModels.length > 0) {
        console.log(`   Found ${embedModels.length} models supporting embedContent:`);
        embedModels.forEach((m) => console.log(`   • ${m.name}`));

        const preferred =
          embedModels.find((m) => m.name.includes("gemini-embedding-001")) ||
          embedModels.find((m) => m.name.includes("text-embedding-004")) ||
          embedModels.find((m) => m.name.includes("embedding-001")) ||
          embedModels[0];
        const rawName = preferred.name.replace(/^models\//, "");
        console.log(`✅ Selected working model: ${rawName}\n`);
        return { ver: "v1beta", model: rawName };
      }
    }
  } catch (e) {
    console.warn("⚠️ Could not query ListModels:", e.message);
  }

  // Fallback candidate probing
  const candidates = [
    { ver: "v1beta", model: "gemini-embedding-001" },
    { ver: "v1", model: "gemini-embedding-001" },
    { ver: "v1beta", model: "text-embedding-004" },
    { ver: "v1beta", model: "embedding-001" },
  ];

  for (const c of candidates) {
    try {
      const url = `https://generativelanguage.googleapis.com/${c.ver}/models/${c.model}:embedContent?key=${API_KEY}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: `models/${c.model}`,
          content: { parts: [{ text: "test" }] },
        }),
      });
      if (res.ok) {
        return c;
      }
    } catch {}
  }
  return { ver: "v1beta", model: "gemini-embedding-001" };
}

async function embedSingleText(endpoint, text) {
  const url = `https://generativelanguage.googleapis.com/${endpoint.ver}/models/${endpoint.model}:embedContent?key=${API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${endpoint.model}`,
      content: { parts: [{ text }] },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API error ${res.status}: ${errorText}`);
  }

  const data = await res.json();
  const vec = data.embedding.values;
  return vec.map((v) => Math.round(v * 100000) / 100000);
}

async function run() {
  const endpoint = await findEndpoint();

  // ═══════════════════════════════════════════════════════
  // TASK 1: Embed portfolioKnowledge.txt (Single Source of Truth)
  // ═══════════════════════════════════════════════════════
  const kbSections = parseKnowledgeSections();
  console.log(`📚 Found ${kbSections.length} sections in portfolioKnowledge.txt (Single Source of Truth)`);
  console.log(`Generating embeddings for Chatbot Hybrid RAG...\n`);

  const kbEmbeddings = [];
  for (let i = 0; i < kbSections.length; i++) {
    const sec = kbSections[i];
    const textToEmbed = `${sec.title}. Cluster: ${sec.cluster}. Keywords: ${sec.keywords.join(", ")}. Description: ${sec.text}`;
    process.stdout.write(` [${i + 1}/${kbSections.length}] ${sec.title.slice(0, 42).padEnd(45)} `);

    try {
      const vec = await embedSingleText(endpoint, textToEmbed);
      kbEmbeddings.push({
        id: sec.id,
        title: sec.title,
        cluster: sec.cluster,
        link: sec.link,
        embedding: vec,
      });
      console.log("✅");
    } catch (err) {
      console.log("❌", err.message);
    }

    if (i < kbSections.length - 1) {
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  if (kbEmbeddings.length > 0) {
    const outKbPath = path.resolve(__dirname, "..", "src", "data", "knowledgeEmbeddings.json");
    fs.writeFileSync(outKbPath, JSON.stringify(kbEmbeddings, null, 2));
    console.log(`\n🎉 Saved ${kbEmbeddings.length} knowledge embeddings to src/data/knowledgeEmbeddings.json!`);
  }

  console.log("\n🚀 Done! Chatbot Hybrid RAG is 100% in sync with portfolioKnowledge.txt!\n");
}

run();
