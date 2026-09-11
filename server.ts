import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Express
const app = express();
app.use(express.json());
const PORT = parseInt(process.env.PORT || "3001", 10);

// Initialize GoogleGenAI SDK with standard safety & telemetry parameters
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// API endpoint for Asset Recommendation Assistant
app.post("/api/ai/recommend", async (req, res) => {
  try {
    const { prompt, assets } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt requirement is required." });
    }

    if (!assets || !Array.isArray(assets)) {
      return res.status(400).json({ error: "A list of candidate assets must be provided." });
    }

    // Filter list of assets to check-out (Available)
    const availableAssets = assets.filter(a => a.status === "Available");

    if (availableAssets.length === 0) {
      return res.json({
        recommendations: [],
        summary: "There are currently no Available assets in your organization's directory to recommend. All matching inventory is either allocated, lost, or under maintenance.",
      });
    }

    const availableAssetsStr = JSON.stringify(availableAssets);

    // Call Gemini API using the recommended gemini-3.6-flash model
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `User requirement: "${prompt}"\n\nCandidate assets available for allocation:\n${availableAssetsStr}`,
      config: {
        systemInstruction: `You are the specialized Asset Recommendation Assistant for AssetFlow, an enterprise physical asset tracking system.
Your goal is to analyze the user's natural language hardware or resource requirements and rank the actually-available assets that fit best.
Rules:
1. ONLY recommend assets that are explicitly provided in the available assets list.
2. DO NOT hallucinate or invent new assets that are not in the list.
3. Order the recommendations from best fit (rank 1) to least.
4. Keep explanations professional, objective, and clear, citing how the asset matches their specifications.
5. If none of the assets fit the requirement, explain what was missing in a friendly, constructive tone.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendations: {
              type: Type.ARRAY,
              description: "Ranked list of recommended assets.",
              items: {
                type: Type.OBJECT,
                properties: {
                  assetTag: { type: Type.STRING, description: "The unique tag code of the recommended asset (e.g. AST-1001)." },
                  rank: { type: Type.INTEGER, description: "The ranking order, starting at 1 for the best match." },
                  confidence: { type: Type.STRING, description: "Match confidence level: High, Medium, or Low." },
                  explanation: { type: Type.STRING, description: "Clear and specific explanation of why this asset is recommended." }
                },
                required: ["assetTag", "rank", "confidence", "explanation"]
              }
            },
            summary: {
              type: Type.STRING,
              description: "A summary advising on the options or explaining gaps if no asset perfectly fits."
            }
          },
          required: ["recommendations", "summary"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    res.json(result);
  } catch (err: any) {
    console.error("Gemini Asset Recommendation Error:", err);
    res.status(500).json({ error: "Failed to generate recommendations from the AI engine.", details: err.message });
  }
});

// API endpoint for Smart Resource Booking Assistant
app.post("/api/ai/book", async (req, res) => {
  try {
    const { prompt, resources, currentTime } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Booking command prompt is required." });
    }

    if (!resources || !Array.isArray(resources)) {
      return res.status(400).json({ error: "A list of corporate resources is required." });
    }

    const resourcesStr = JSON.stringify(resources);

    // Call Gemini to parse details from prompt
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `User command: "${prompt}"\n\nCurrent time/context: ${currentTime || new Date().toISOString()}\n\nAvailable corporate resources:\n${resourcesStr}`,
      config: {
        systemInstruction: `You are the Smart Resource Booking Assistant for AssetFlow.
Your task is to take a natural language booking request (e.g. "Reserve the Boardroom for tomorrow from 10am to noon") and extract:
1. Which resource the user wants to book. Compare the user's requested resource name to the available resources list and match it to a single resource's ID.
2. The start and end timestamps formatted as ISO strings (YYYY-MM-DDTHH:mm).
Use the provided current time context to resolve relative date words like "tomorrow", "this afternoon", "next Monday", "from 3 to 4 PM".

If a field is missing (e.g., they didn't specify a time or date, or the resource is completely ambiguous), return null for that field and ask for clarification in the explanation.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchedResourceId: { type: Type.STRING, description: "The ID of the matched resource, or null if not resolvable." },
            matchedResourceName: { type: Type.STRING, description: "The display name of the matched resource, or null if not resolvable." },
            startTime: { type: Type.STRING, description: "ISO start timestamp (e.g. 2026-08-06T10:00), or null if missing." },
            endTime: { type: Type.STRING, description: "ISO end timestamp (e.g. 2026-08-06T12:00), or null if missing." },
            explanation: { type: Type.STRING, description: "Friendly text explaining what was understood, what was booked, or what details are still needed." }
          },
          required: ["matchedResourceId", "matchedResourceName", "startTime", "endTime", "explanation"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    res.json(result);
  } catch (err: any) {
    console.error("Gemini Booking Parser Error:", err);
    res.status(500).json({ error: "Failed to parse booking instructions from the AI engine.", details: err.message });
  }
});

// API endpoint for AI Report Generator
app.post("/api/ai/report", async (req, res) => {
  try {
    const { stats } = req.body;

    if (!stats) {
      return res.status(400).json({ error: "Statistical context is required for analysis." });
    }

    const statsStr = JSON.stringify(stats);

    // Call Gemini to write the executive narrative
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Raw Quantitative Data Stats:\n${statsStr}`,
      config: {
        systemInstruction: `You are the AI Report Generator for AssetFlow, an enterprise physical asset tracking and scheduling system.
Your task is to take raw quantitative metrics about an organization's physical inventory, categories, maintenance logs, and bookings, and write a high-level executive narrative.
Instructions:
1. Focus on presenting professional insights, status analysis, and clear trends.
2. Highlight key points: e.g., device-by-category ratio, active maintenance concerns, inventory idle rates, or booking frequencies.
3. Offer 2-3 constructive, actionable strategic recommendations based ONLY on the metrics.
4. Keep the writing charming, elegant, and highly professional. Use clean Markdown styling for visual rhythm (bolding, spacing, bullet lists). No introduction fluff like "Certainly, here is your report." Just output the polished report directly.`
      }
    });

    res.json({ report: response.text });
  } catch (err: any) {
    console.error("Gemini Report Generation Error:", err);
    res.status(500).json({ error: "Failed to compile the executive narrative report.", details: err.message });
  }
});

// --- Vite Development Middleware or Production Static Handler ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, () => {
    console.log(`[AssetFlow Server] listening securely on http://localhost:${PORT}`);
  });
}

startServer();
