import { db } from "../db/firebase";
import { addDoc, updateDoc, deleteDoc, doc, collection } from "firebase/firestore";

export async function askAssistant(prompt: string, tasks: any[], userId: string) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, tasks }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to communicate with assistant");
  }

  const { text, functionCalls } = await res.json();

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
