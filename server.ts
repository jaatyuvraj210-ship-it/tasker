import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, FunctionDeclaration, GenerateContentResponse } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, tasks } = req.body;
      const key = process.env.GEMINI_API_KEY;
      
      if (!key) {
        return res.status(500).json({ error: "Gemini API Key is missing. Please add it to your secrets." });
      }

      const ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const addTaskDecl: FunctionDeclaration = {
        name: "addTask",
        description: "Add a new task.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Title of the task" },
            dueDate: { type: Type.STRING, description: "Due date perfectly formatted as YYYY-MM-DD (e.g. '2026-06-05'), or null if unspecified." },
            priority: { type: Type.STRING, description: "Priority: Low, Medium, High" },
          },
          required: ["title", "priority"],
        },
      };

      const updateTaskDecl: FunctionDeclaration = {
        name: "updateTask",
        description: "Updates an existing task.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            taskId: { type: Type.STRING, description: "ID of the task to update" },
            status: { type: Type.STRING, description: "Status: pending or completed" },
            priority: { type: Type.STRING, description: "Priority: Low, Medium, High" },
            dueDate: { type: Type.STRING, description: "Due date perfectly formatted as YYYY-MM-DD, or null." },
          },
          required: ["taskId"],
        },
      };

      const deleteTaskDecl: FunctionDeclaration = {
        name: "deleteTask",
        description: "Deletes a task.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            taskId: { type: Type.STRING, description: "ID of the task to delete" },
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
          tools: [{ functionDeclarations: [addTaskDecl, updateTaskDecl, deleteTaskDecl] }],
        },
      });

      const functionCalls = response.functionCalls;
      const text = response.text;

      return res.json({ text, functionCalls: functionCalls || [] });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  });

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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
