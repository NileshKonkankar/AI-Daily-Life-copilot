import { GoogleGenAI, Type } from "@google/genai";
import { Task } from "./taskService";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = "gemini-3.1-pro-preview"; // Using pro for complex reasoning

export const prioritizeTasks = async (tasks: Task[]) => {
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  if (pendingTasks.length === 0) return null;

  const prompt = `
    Here is a list of my pending tasks:
    ${JSON.stringify(pendingTasks.map(t => ({
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

  try {
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

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error prioritizing tasks:", error);
    throw error;
  }
};

export const getNextBestAction = async (tasks: Task[]) => {
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  if (pendingTasks.length === 0) return null;

  const prompt = `
    Here is a list of my pending tasks:
    ${JSON.stringify(pendingTasks.map(t => ({
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

  try {
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

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error getting next action:", error);
    throw error;
  }
};

export const generateDailySummary = async (tasks: Task[]) => {
  const prompt = `
    Here is my task list:
    ${JSON.stringify(tasks.map(t => ({
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

  try {
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

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error generating daily summary:", error);
    throw error;
  }
};
