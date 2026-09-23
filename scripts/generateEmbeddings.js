/**
 * Pure Node.js script: Generate Gemini embeddings for all resume vector nodes.
 * Run directly with: node scripts/generateEmbeddings.js
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

// ── Read resumeVectorData to extract nodes ──
const vectorDataPath = path.resolve(__dirname, "..", "src", "data", "resumeVectorData.ts");
const fileContent = fs.readFileSync(vectorDataPath, "utf-8");

const nodeRegex = /id:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*cluster:\s*"([^"]+)",[\s\S]*?title:\s*"([^"]+)",\s*subtitle:\s*"([^"]+)",\s*description:\s*"([^"]+)"/g;
const nodes = [];
let match;
while ((match = nodeRegex.exec(fileContent)) !== null) {
  nodes.push({
    id: match[1],
    label: match[2],
    cluster: match[3],
    title: match[4],
    subtitle: match[5],
    description: match[6],
  });
}

console.log(`\n🧠 Extracted ${nodes.length} nodes from resumeVectorData.ts`);
console.log(`Connecting to Google Gemini API...`);

async function findEndpoint() {
  const candidates = [
    { ver: "v1beta", model: "text-embedding-004" },
    { ver: "v1", model: "text-embedding-004" },
    { ver: "v1beta", model: "embedding-001" },
    { ver: "v1", model: "embedding-001" },
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
        console.log(`✅ Verified working model endpoint: ${c.ver}/models/${c.model}`);
        return c;
      }
    } catch {}
  }
  return { ver: "v1beta", model: "text-embedding-004" };
}

async function run() {
  const endpoint = await findEndpoint();
  console.log(`\nGenerating embeddings using [${endpoint.model}]...\n`);
  const embeddings = [];

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const textToEmbed = `${n.title}. ${n.subtitle}. ${n.description}`;
    process.stdout.write(` [${i + 1}/${nodes.length}] ${n.label.padEnd(35)} `);

    try {
      const url = `https://generativelanguage.googleapis.com/${endpoint.ver}/models/${endpoint.model}:embedContent?key=${API_KEY}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: `models/${endpoint.model}`,
          content: { parts: [{ text: textToEmbed }] },
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`API error ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      const vec = data.embedding.values;
      const rounded = vec.map((v) => Math.round(v * 100000) / 100000);
      embeddings.push({
        id: n.id,
        cluster: n.cluster,
        embedding: rounded,
      });
      console.log("✅");
    } catch (err) {
      console.log("❌", err.message);
    }

    if (i < nodes.length - 1) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  if (embeddings.length > 0) {
    const outPath = path.resolve(__dirname, "..", "src", "data", "precomputedEmbeddings.json");
    fs.writeFileSync(outPath, JSON.stringify(embeddings, null, 2));
    console.log(`\n🎉 Successfully saved ${embeddings.length} embeddings to src/data/precomputedEmbeddings.json!\n`);
  }
}

run();
