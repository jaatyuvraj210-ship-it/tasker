import { db } from "../db/firebase";
import { addDoc, updateDoc, deleteDoc, doc, collection } from "firebase/firestore";
import { GoogleGenAI } from "@google/genai";

async function executeFunctionCalls(functionCalls: any[], userId: string) {
  if (functionCalls && functionCalls.length > 0) {
    for (const call of functionCalls) {
      if (call.name === "addTask") {
        await addDoc(collection(db, "users", userId, "tasks"), {
          title: call.args.title || "Untitled Task",
          priority: call.args.priority || "Medium",
          dueDate: call.args.dueDate || null,
          status: "pending",
          userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      } else if (call.name === "updateTask") {
        if (!call.args.taskId) continue;
        const docRef = doc(db, "users", userId, "tasks", call.args.taskId);
        
        const updates: any = { updatedAt: Date.now() };
        if (call.args.status) updates.status = call.args.status;
        if (call.args.priority) updates.priority = call.args.priority;
        if (call.args.dueDate) updates.dueDate = call.args.dueDate;
        if (call.args.title) updates.title = call.args.title;
        
        await updateDoc(docRef, updates);
      } else if (call.name === "deleteTask") {
        if (!call.args.taskId) continue;
        const docRef = doc(db, "users", userId, "tasks", call.args.taskId);
        await deleteDoc(docRef);
      }
    }
  }
}

async function callGeminiDirect(prompt: string, tasks: any[], apiKey: string) {
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  const addTaskDecl = {
    name: "addTask",
    description: "Add a new task.",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING", description: "Title of the task" },
        dueDate: { type: "STRING", description: "Due date perfectly formatted as YYYY-MM-DD (e.g. '2026-06-05'), or null if unspecified." },
        priority: { type: "STRING", description: "Priority: Low, Medium, High" },
      },
      required: ["title", "priority"],
    },
  };

  const updateTaskDecl = {
    name: "updateTask",
    description: "Updates an existing task.",
    parameters: {
      type: "OBJECT",
      properties: {
        taskId: { type: "STRING", description: "ID of the task to update" },
        status: { type: "STRING", description: "Status: pending or completed" },
        priority: { type: "STRING", description: "Priority: Low, Medium, High" },
        dueDate: { type: "STRING", description: "Due date perfectly formatted as YYYY-MM-DD, or null." },
      },
      required: ["taskId"],
    },
  };

  const deleteTaskDecl = {
    name: "deleteTask",
    description: "Deletes a task.",
    parameters: {
      type: "OBJECT",
      properties: {
        taskId: { type: "STRING", description: "ID of the task to delete" },
      },
      required: ["taskId"],
    },
  };

  const aiContext = `You are an AI assistant for a task management app. 
Current Tasks: ${JSON.stringify(tasks)}
If the user asks to add, create, plan, delete, or update a task, use the function calls. 
If no action is needed, just reply as an assistant. You can give suggestions directly in the chat.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      systemInstruction: aiContext,
      tools: [{ functionDeclarations: [addTaskDecl as any, updateTaskDecl as any, deleteTaskDecl as any] }],
    },
  });

  return {
    text: response.text || "",
    functionCalls: response.functionCalls || []
  };
}

export async function askAssistant(prompt: string, tasks: any[], userId: string) {
  const clientApiKey = localStorage.getItem("gemini_client_api_key");

  // If a client API key is configured, use direct client-side execution immediately
  if (clientApiKey && clientApiKey.trim()) {
    try {
      const { text, functionCalls } = await callGeminiDirect(prompt, tasks, clientApiKey);
      await executeFunctionCalls(functionCalls, userId);
      return text;
    } catch (directErr: any) {
      throw new Error(`Client Gemini API Call failed: ${directErr.message || directErr}`);
    }
  }

  // Otherwise, default to full-stack Express backend
  let res;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, tasks }),
    });
  } catch (fetchErr: any) {
    throw new Error(`Connection failed: ${fetchErr.message || "Is the backend server running?"}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const textSample = await res.text();
    if (
      textSample.trim().startsWith("<") || 
      textSample.includes("<!DOCTYPE") || 
      textSample.includes("The page could not be found") || 
      textSample.includes("Cannot get") || 
      textSample.includes("not found")
    ) {
      throw new Error("This app is currently running on a static hosting platform (like Vercel) where the backend server is not available. To use the AI Assistant, please set your Gemini API Key in the Settings menu (click the gear icon in the top right of the header).");
    }
    throw new Error(`Expected JSON but received content-type "${contentType}". Response start: ${textSample.slice(0, 100)}`);
  }

  if (!res.ok) {
    let errorMsg = "Failed to communicate with assistant";
    try {
      const errorData = await res.json();
      errorMsg = errorData.error || errorMsg;
    } catch {
      errorMsg = `Server returned status ${res.status}`;
    }
    throw new Error(errorMsg);
  }

  let text = "";
  let functionCalls: any[] = [];
  try {
    const data = await res.json();
    text = data.text;
    functionCalls = data.functionCalls || [];
  } catch (jsonErr: any) {
    throw new Error(`Failed to parse response JSON: ${jsonErr.message}`);
  }

  await executeFunctionCalls(functionCalls, userId);
  return text;
}
