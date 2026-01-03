import { GoogleGenAI, Type, FunctionDeclaration, Tool, Schema } from "@google/genai";
import { AITaskResponse, Task } from "../types";

// Helper to sanitize JSON string if it contains markdown code blocks
const cleanJsonString = (str: string): string => {
  return str.replace(/```json\n?|```/g, '').trim();
};

export const analyzeHomeworkImage = async (base64Image: string): Promise<AITaskResponse[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Use gemini-3-flash-preview which supports multimodal input
  const modelId = "gemini-3-flash-preview"; 

  const prompt = `
    Analyze this image of homework/tasks. 
    Identify individual tasks. 
    For each task, determine:
    1. The subject (Math, Language, Science, Art, or Other).
    2. A short, clear title (e.g., "Page 42 Ex 1-5").
    3. Estimated minutes to complete (be realistic for a student, default to 20 if unsure).
    4. Break it down into 3-5 small, actionable steps (e.g., "Read passage", "Answer Q1", "Check spelling").
    
    Return ONLY a JSON array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING },
              title: { type: Type.STRING },
              estimatedMinutes: { type: Type.INTEGER },
              steps: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["subject", "title", "estimatedMinutes", "steps"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    const parsed = JSON.parse(cleanJsonString(text)) as AITaskResponse[];
    return parsed;
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw new Error("Failed to analyze homework image.");
  }
};

export const generateStepsForTask = async (taskTitle: string, subject: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Use gemini-3-flash-preview for text generation
  const modelId = "gemini-3-flash-preview";

  const prompt = `
    I have a homework task: "${taskTitle}" for subject "${subject}".
    Break this down into 3-5 simple, actionable micro-steps for a student to reduce anxiety.
    Return ONLY a JSON array of strings.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const text = response.text;
    if (!text) return ["Start task", "Complete task"];
    
    return JSON.parse(cleanJsonString(text));
  } catch (error) {
    console.error("Gemini Step Gen Failed:", error);
    return ["Prepare materials", "Focus on the first problem", "Continue through the rest", "Review work"];
  }
};

// --- Agent Logic ---

const updateTaskTimeTool: FunctionDeclaration = {
  name: "updateTaskTime",
  description: "Update the estimated minutes for a specific task identified by a keyword.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      taskKeyword: { type: Type.STRING, description: "A word or phrase to identify the task (e.g., 'Math', 'Essay')." },
      newMinutes: { type: Type.INTEGER, description: "The new duration in minutes." }
    },
    required: ["taskKeyword", "newMinutes"]
  }
};

const reorderTaskTool: FunctionDeclaration = {
  name: "reorderTask",
  description: "Move a task to a specific position (1-based index) in the list.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      taskKeyword: { type: Type.STRING, description: "A word or phrase to identify the task." },
      newPosition: { type: Type.INTEGER, description: "The new position number (1 for top, 2 for second, etc.)." }
    },
    required: ["taskKeyword", "newPosition"]
  }
};

const deleteTaskTool: FunctionDeclaration = {
  name: "deleteTask",
  description: "Remove a task from the list.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      taskKeyword: { type: Type.STRING, description: "A word or phrase to identify the task." }
    },
    required: ["taskKeyword"]
  }
};

export const processAgentCommand = async (
  userMessage: string, 
  currentTasks: Task[]
): Promise<{ responseText: string; updatedTasks?: Task[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = "gemini-3-flash-preview";

  const tools: Tool[] = [{
    functionDeclarations: [updateTaskTimeTool, reorderTaskTool, deleteTaskTool]
  }];

  const taskListContext = currentTasks.map((t, i) => 
    `${i + 1}. [${t.subject}] ${t.title} (${t.estimatedMinutes} min)`
  ).join("\n");

  const systemInstruction = `
    You are a friendly, encouraging study companion for a student.
    Your goal is to help them manage their homework list.
    Here is the current list of tasks:
    ${taskListContext}

    If the user asks to change something, use the appropriate tool.
    If the user just wants to chat or asks for encouragement, just reply with text.
    Keep your responses brief (under 30 words) and motivating.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: userMessage,
      config: {
        tools: tools,
        systemInstruction: systemInstruction,
      }
    });

    const candidate = response.candidates?.[0];
    const functionCalls = candidate?.content?.parts?.filter(p => p.functionCall).map(p => p.functionCall);
    
    // Default response text if no function call, or overridden by tool execution result later
    let responseText = candidate?.content?.parts?.find(p => p.text)?.text || "I've updated your plan!";
    let newTasks = [...currentTasks];
    let tasksModified = false;

    if (functionCalls && functionCalls.length > 0) {
      for (const call of functionCalls) {
        if (!call) continue;
        const args = call.args as any;
        const lowerKeyword = (args.taskKeyword || "").toLowerCase();

        // Helper to find index
        const findIndex = () => newTasks.findIndex(t => 
          t.title.toLowerCase().includes(lowerKeyword) || 
          t.subject.toLowerCase().includes(lowerKeyword)
        );

        if (call.name === "updateTaskTime") {
          const idx = findIndex();
          if (idx !== -1) {
            newTasks[idx] = { ...newTasks[idx], estimatedMinutes: args.newMinutes };
            responseText = `Updated ${newTasks[idx].title} to ${args.newMinutes} minutes.`;
            tasksModified = true;
          } else {
            responseText = `I couldn't find a task matching "${args.taskKeyword}".`;
          }
        } 
        else if (call.name === "deleteTask") {
          const idx = findIndex();
          if (idx !== -1) {
            const removed = newTasks[idx];
            newTasks.splice(idx, 1);
            responseText = `Removed ${removed.title} from your list.`;
            tasksModified = true;
          } else {
             responseText = `I couldn't find a task matching "${args.taskKeyword}".`;
          }
        }
        else if (call.name === "reorderTask") {
          const idx = findIndex();
          if (idx !== -1) {
            const taskToMove = newTasks[idx];
            newTasks.splice(idx, 1); // remove
            // Clamp position
            let targetIndex = (args.newPosition as number) - 1;
            if (targetIndex < 0) targetIndex = 0;
            if (targetIndex > newTasks.length) targetIndex = newTasks.length;
            
            newTasks.splice(targetIndex, 0, taskToMove);
            responseText = `Moved ${taskToMove.title} to position #${targetIndex + 1}.`;
            tasksModified = true;
          } else {
             responseText = `I couldn't find a task matching "${args.taskKeyword}".`;
          }
        }
      }
    }

    return {
      responseText: responseText,
      updatedTasks: tasksModified ? newTasks : undefined
    };

  } catch (error) {
    console.error("Agent Error:", error);
    return { responseText: "Sorry, I had trouble connecting to my brain! Try again?" };
  }
};