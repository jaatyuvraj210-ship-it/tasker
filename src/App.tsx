import React, { useEffect, useState } from "react";
import { format, isToday } from "date-fns";
import { Plus, LogOut, CheckCircle2, Sun, Moon, Flame } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db, getLocalUser, logout } from "./db/firebase";
import { collection, query, onSnapshot, addDoc, updateDoc, doc, deleteDoc, orderBy } from "firebase/firestore";
import { Task, Priority } from "./types";
import { TaskItem } from "./components/TaskItem";
import { AIAssistant } from "./components/AIAssistant";
import { cn } from "./lib/utils";
import confetti from "canvas-confetti";

export default function App() {
  const [user, setUser] = useState<{uid: string, displayName: string} | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "today" | "completed">("all");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("Medium");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [chaosMode, setChaosMode] = useState(false);

  useEffect(() => {
    if (theme === "dark" || chaosMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [theme, chaosMode]);

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
      if (updates.status === "completed") {
        const taskNode = document.getElementById(`task-${id}`);
        if (taskNode) {
          const rect = taskNode.getBoundingClientRect();
          const x = (rect.left + rect.width / 2) / window.innerWidth;
          const y = (rect.top + rect.height / 2) / window.innerHeight;
          
          if (chaosMode) {
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
            
            const interval: any = setInterval(function() {
              const particleRatio = 50;
              confetti({
                ...defaults, origin: { x: randomInRange(0.1, 0.9), y: randomInRange(0.1, 0.9) },
                colors: ['#ef4444', '#f97316', '#000000', '#ffffff'],
                particleCount: Math.floor(200 * particleRatio)
              });
            }, 250);
            setTimeout(() => clearInterval(interval), 1000);
          } else {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { x, y }
            });
          }
        } else {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.8 }
          });
        }
      }
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
    <div className={cn("min-h-screen pb-24 transition-all duration-500", chaosMode ? "bg-red-950/20" : "")}>
      <header className={cn("sticky top-0 z-10 backdrop-blur-xl border-b transition-colors", chaosMode ? "bg-red-900/10 border-red-900/50" : "bg-background/80 border-border")}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className={cn("w-6 h-6", chaosMode ? "text-red-500 animate-pulse" : "text-foreground")} />
            <span className={cn("font-semibold text-lg tracking-tight", chaosMode ? "text-red-500" : "text-foreground")}>
              {chaosMode ? "TASK DESTROYER" : "Tasker"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setChaosMode(c => !c)}
              className={cn("w-9 h-9 flex items-center justify-center rounded-full transition-colors", chaosMode ? "bg-red-500/20 text-red-500 hover:bg-red-500/40" : "text-muted hover:text-foreground hover:bg-foreground/5")}
              title={chaosMode ? "Disable Chaos Mode" : "Enable Chaos Mode"}
            >
              <Flame className={cn("w-4 h-4", chaosMode && "animate-bounce")} />
            </button>
            <button
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-foreground/5 transition-colors text-muted hover:text-foreground"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
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
                <div id={`task-${task.id}`} key={task.id} className={cn("transition-transform", chaosMode ? "hover:-rotate-1" : "")}>
                  <TaskItem 
                    task={task} 
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                  />
                </div>
              ))
            )}
          </AnimatePresence>
        </div>
      </main>

      <AIAssistant tasks={tasks} userId={user.uid} chaosMode={chaosMode} />
    </div>
  );
}

