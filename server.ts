import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = "gemini-3.1-pro-preview";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/ai/prioritize", async (req, res) => {
    try {
      const { tasks } = req.body;
      const pendingTasks = tasks.filter((t: any) => t.status === 'pending');
      if (pendingTasks.length === 0) {
        return res.json([]);
      }

      const prompt = `
        Here is a list of my pending tasks:
        ${JSON.stringify(pendingTasks.map((t: any) => ({
          id: t.id,
          title: t.title,
          deadline: t.deadline,
          priority: t.priority,
          category: t.category
        })))}

        Please analyze these tasks and prioritize them. Consider deadlines, priority levels, and category balance.
        Return a JSON array of objects, where each object has:
        - id: The task ID
        - reasoning: A brief explanation of why it was ranked at this position
        - urgency: "high", "medium", or "low"
      `;

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                reasoning: { type: Type.STRING },
                urgency: { type: Type.STRING }
              },
              required: ["id", "reasoning", "urgency"]
            }
          }
        }
      });

      res.json(JSON.parse(response.text || "[]"));
    } catch (error) {
      console.error("Error prioritizing tasks:", error);
      res.status(500).json({ error: "Failed to prioritize tasks" });
    }
  });

  app.post("/api/ai/next-action", async (req, res) => {
    try {
      const { tasks } = req.body;
      const pendingTasks = tasks.filter((t: any) => t.status === 'pending');
      if (pendingTasks.length === 0) {
        return res.json({});
      }

      const prompt = `
        Here is a list of my pending tasks:
        ${JSON.stringify(pendingTasks.map((t: any) => ({
          id: t.id,
          title: t.title,
          deadline: t.deadline,
          priority: t.priority,
          category: t.category
        })))}

        What is the single best task I should do right now?
        Consider deadlines, stated priorities, and general productivity principles.
        Return a JSON object with:
        - id: The task ID
        - whyItMattersNow: A short, motivating explanation of why this is the best next step.
      `;

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              whyItMattersNow: { type: Type.STRING }
            },
            required: ["id", "whyItMattersNow"]
          }
        }
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (error) {
      console.error("Error getting next action:", error);
      res.status(500).json({ error: "Failed to get next action" });
    }
  });

  app.post("/api/ai/daily-summary", async (req, res) => {
    try {
      const { tasks } = req.body;
      const prompt = `
        Here is my task list:
        ${JSON.stringify(tasks.map((t: any) => ({
          title: t.title,
          deadline: t.deadline,
          priority: t.priority,
          category: t.category,
          status: t.status
        })))}

        Generate a structured daily plan and summary. 
        Include:
        - planForTheDay: A brief paragraph summarizing the overall strategy for today.
        - timeSuggestions: A list of suggested time blocks or strategies (e.g., "Morning: Deep work on X").
        - focusRecommendations: A short list of tips to stay focused based on the task load.
        - insights: Any insights (e.g., "Overloaded schedule", "Missed deadlines", "Good balance").

        Return a JSON object.
      `;

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              planForTheDay: { type: Type.STRING },
              timeSuggestions: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              focusRecommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              insights: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["planForTheDay", "timeSuggestions", "focusRecommendations", "insights"]
          }
        }
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (error) {
      console.error("Error generating daily summary:", error);
      res.status(500).json({ error: "Failed to generate daily summary" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
