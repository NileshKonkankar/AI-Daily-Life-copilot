import { Task } from "./taskService";

export const prioritizeTasks = async (tasks: Task[]) => {
  try {
    const response = await fetch('/api/ai/prioritize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks })
    });
    if (!response.ok) throw new Error('Failed to prioritize tasks');
    return await response.json();
  } catch (error) {
    console.error("Error prioritizing tasks:", error);
    throw error;
  }
};

export const getNextBestAction = async (tasks: Task[]) => {
  try {
    const response = await fetch('/api/ai/next-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks })
    });
    if (!response.ok) throw new Error('Failed to get next action');
    return await response.json();
  } catch (error) {
    console.error("Error getting next action:", error);
    throw error;
  }
};

export const generateDailySummary = async (tasks: Task[]) => {
  try {
    const response = await fetch('/api/ai/daily-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks })
    });
    if (!response.ok) throw new Error('Failed to generate daily summary');
    return await response.json();
  } catch (error) {
    console.error("Error generating daily summary:", error);
    throw error;
  }
};
