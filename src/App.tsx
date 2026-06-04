import React, { useEffect, useState } from "react";
import { format, isToday } from "date-fns";
import { Plus, LogOut, CheckCircle2, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { auth, db, login, logout } from "./db/firebase";
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, orderBy } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { Task } from "./types";
import { TaskItem } from "./components/TaskItem";
import { AIAssistant } from "./components/AIAssistant";
import { cn } from "./lib/utils";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "today" | "completed">("all");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [theme]);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setAuthError(null);
    setIsLoggingIn(true);
    try {
      await login();
    } catch (e: any) {
      console.error("Login error:", e);
      if (e.code === 'auth/popup-blocked') {
        setAuthError('Sign-in popup was blocked. Please click the "Open in new tab" icon (top right) in the AI Studio preview to sign in.');
      } else if (e.code === 'auth/cancelled-popup-request' || e.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in was cancelled. Please try again.');
      } else {
        setAuthError(e.message || 'Failed to sign in.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) {
      setTasks([]);
      return;
    }

    const q = query(
      collection(db, "users", user.uid, "tasks"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const tsks: Task[] = [];
      snapshot.forEach((doc) => {
        tsks.push({ id: doc.id, ...doc.data() } as Task);
      });
      setTasks(tsks);
    });

    return () => unsub();
  }, [user]);

  const handleUpdate = async (id: string, updates: Partial<Task>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid, "tasks", id), {
        ...updates,
        updatedAt: Date.now()
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "tasks", id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTaskTitle.trim()) return;
    try {
      await addDoc(collection(db, "users", user.uid, "tasks"), {
        title: newTaskTitle.trim(),
        priority: "Medium",
        status: "pending",
        dueDate: null,
        userId: user.uid,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      setNewTaskTitle("");
    } catch (e) {
      console.error(e);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (activeTab === "all") return t.status === "pending";
    if (activeTab === "completed") return t.status === "completed";
    if (activeTab === "today") {
      if (t.status === "completed") return false;
      if (!t.dueDate) return true; // Show undated tasks in today as backlog
      return isToday(new Date(t.dueDate));
    }
    return true;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background transition-colors">
        <div className="max-w-md w-full bg-card p-8 rounded-3xl border border-border shadow-2xl text-center">
          <div className="w-16 h-16 bg-foreground/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-foreground" />
          </div>
          <h1 className="text-2xl font-semibold mb-2 text-foreground">Welcome to Tasker</h1>
          <p className="text-muted mb-8">A minimalist task manager powered by AI.</p>
          
          {authError && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-sm">
              {authError}
            </div>
          )}

          <button 
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full py-3.5 px-4 bg-inverted text-inverted-text font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoggingIn ? (
              <div className="w-5 h-5 border-2 border-inverted-text/20 border-t-inverted-text rounded-full animate-spin" />
            ) : null}
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 transition-colors">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border transition-colors">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-foreground" />
            <span className="font-semibold text-lg tracking-tight text-foreground">Tasker</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-foreground/5 transition-colors text-muted hover:text-foreground"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button 
              onClick={logout}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-foreground/5 transition-colors text-muted hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-10">
        <h1 className="text-3xl font-semibold tracking-tight mb-8 text-foreground">Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user.displayName?.split(' ')[0]}</h1>
        
        <form onSubmit={handleAddSubmit} className="relative mb-8">
          <input 
            type="text" 
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full bg-card border border-border rounded-2xl py-4 pl-5 pr-16 text-foreground placeholder:text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all shadow-sm"
          />
          <button
            type="submit"
            disabled={!newTaskTitle.trim()}
            className="absolute right-2 top-2 bottom-2 w-[3.25rem] flex items-center justify-center bg-primary text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-0 disabled:scale-95"
          >
            <Plus className="w-5 h-5" />
          </button>
        </form>

        <div className="flex items-center gap-2 mb-6 no-scrollbar overflow-x-auto pb-2">
          {(["all", "today", "completed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap border",
                activeTab === tab 
                  ? "bg-inverted text-inverted-text border-transparent" 
                  : "bg-card text-muted hover:text-foreground border-border hover:border-foreground/20"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredTasks.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="py-12 text-center text-muted"
              >
                No tasks in this view.
              </motion.div>
            ) : (
              filteredTasks.map(task => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </main>

      <AIAssistant tasks={tasks} userId={user.uid} />
    </div>
  );
}

