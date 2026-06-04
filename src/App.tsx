import React, { useEffect, useState } from "react";
import { format, isToday } from "date-fns";
import { Plus, LogOut, CheckCircle2, Sun, Moon, Settings, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db, getLocalUser, logout } from "./db/firebase";
import { collection, query, onSnapshot, addDoc, updateDoc, doc, deleteDoc, orderBy } from "firebase/firestore";
import { Task, Priority } from "./types";
import { TaskItem } from "./components/TaskItem";
import { AIAssistant } from "./components/AIAssistant";
import { cn } from "./lib/utils";

export default function App() {
  const [user, setUser] = useState<{uid: string, displayName: string} | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "today" | "completed">("all");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("Medium");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [clientApiKey, setClientApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem("gemini_client_api_key") || "";
    setClientApiKey(savedKey);
  }, []);

  useEffect(() => {
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [theme]);

  const handleLogin = () => {
    setUser(getLocalUser());
  };

  useEffect(() => {
    // Just mock auth state checking
    setTimeout(() => {
      const existingUser = localStorage.getItem("tasker_local_user_id");
      if (existingUser) {
        setUser(getLocalUser());
      }
      setAuthLoading(false);
    }, 500);
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
        priority: newTaskPriority,
        status: "pending",
        dueDate: null,
        userId: user.uid,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      setNewTaskTitle("");
      setNewTaskPriority("Medium");
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

          <button 
            onClick={handleLogin}
            className="w-full py-3.5 px-4 bg-inverted text-inverted-text font-medium rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            Enter App
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
              onClick={() => setIsSettingsOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-foreground/5 transition-colors text-muted hover:text-foreground"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button 
              onClick={() => {
                logout();
                setUser(null);
              }}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-foreground/5 transition-colors text-muted hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-10">
        <h1 className="text-3xl font-semibold tracking-tight mb-8 text-foreground">Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user.displayName?.split(' ')[0]}</h1>
        
        <form onSubmit={handleAddSubmit} className="mb-8 relative">
          <div className="relative">
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
          </div>
          <AnimatePresence>
            {newTaskTitle.trim().length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="flex items-center gap-2 overflow-hidden"
              >
                {(["Low", "Medium", "High"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setNewTaskPriority(p)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                      newTaskPriority === p
                        ? p === "High" ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" :
                          p === "Medium" ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20" :
                          "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                        : "bg-transparent text-muted border-border hover:border-foreground/20 hover:text-foreground"
                    )}
                  >
                    {p} Priority
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
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

      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-card w-full max-w-sm p-6 rounded-3xl border border-border shadow-2xl relative overflow-hidden"
            >
              <h2 className="text-xl font-semibold mb-2 text-foreground">Settings</h2>
              <p className="text-xs text-muted mb-6">Configure custom options for your Tasker application.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-2">
                    Client Gemini API Key (for Vercel / Static sites)
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={clientApiKey}
                      onChange={(e) => setClientApiKey(e.target.value)}
                      placeholder="Enter your Gemini API key..."
                      className="w-full bg-background border border-border rounded-xl py-3 pl-4 pr-12 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-primary/50 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted mt-2 leading-relaxed">
                    This key is stored locally on this browser. It is <span className="font-semibold text-primary">only required</span> if running on a static hosting platform (like Vercel) where the backend server is not available.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const savedKey = localStorage.getItem("gemini_client_api_key") || "";
                    setClientApiKey(savedKey);
                    setIsSettingsOpen(false);
                  }}
                  className="px-4 py-2 border border-border text-sm rounded-xl text-muted hover:text-foreground hover:bg-foreground/5 transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (clientApiKey.trim()) {
                      localStorage.setItem("gemini_client_api_key", clientApiKey.trim());
                    } else {
                      localStorage.removeItem("gemini_client_api_key");
                    }
                    setIsSettingsOpen(false);
                  }}
                  className="px-5 py-2 bg-primary hover:opacity-90 text-white text-sm rounded-xl transition-all font-medium"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

