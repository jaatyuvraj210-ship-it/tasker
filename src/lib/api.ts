import { db } from "../db/firebase";
import { addDoc, updateDoc, deleteDoc, doc, collection } from "firebase/firestore";

export async function askAssistant(prompt: string, tasks: any[], userId: string) {
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
      throw new Error("The backend API endpoint (/api/chat) returned HTML instead of JSON. This typically happens when the app is hosted on a static-only platform (like Vercel) without serverless routing configured, or when the Express backend is offline. Please make sure the node backend is running.");
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

  return text;
}
