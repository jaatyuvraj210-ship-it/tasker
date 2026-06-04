import { useState, useRef, useEffect } from "react";
import { CheckCircle2, Send, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { askAssistant } from "../lib/api";
import { Task } from "../types";

export function AIAssistant({ tasks, userId }: { tasks: Task[]; userId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "assistant" | "user"; text: string }[]>([
    { role: "assistant", text: "Hi! I can help you manage your tasks. Try saying 'Add gym tomorrow' or 'What should I do today?'" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setIsLoading(true);

    try {
      const reply = await askAssistant(userMessage, tasks, userId);
      if (reply) {
        setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", text: "Done!" }]);
      }
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: "assistant", text: `Error: ${e.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-16 right-0 w-[85vw] max-w-sm h-[400px] bg-card/90 backdrop-blur-xl border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-colors"
          >
            <div className="p-4 border-b border-border flex justify-between items-center bg-foreground/5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm text-foreground">AI Assistant</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-muted hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3" ref={scrollRef}>
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm ${m.role === "user" ? "bg-primary/20 text-purple-700 dark:text-purple-100 rounded-br-sm" : "bg-foreground/10 text-foreground rounded-bl-sm"}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-foreground/10 p-3 rounded-2xl rounded-bl-sm">
                    <Loader2 className="w-4 h-4 text-muted animate-spin" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-border bg-foreground/5">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex items-center gap-2 bg-background rounded-full p-1 pl-4 border border-border focus-within:border-primary/50 transition-colors"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything..."
                  className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
                  disabled={isLoading}
                />
                <button 
                  type="submit" 
                  disabled={isLoading || !input.trim()}
                  className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white disabled:opacity-50 disabled:bg-foreground/20"
                >
                  <Send className="w-4 h-4 pr-[2px] pb-[1px]" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-inverted text-inverted-text rounded-full shadow-lg shadow-foreground/5 hover:scale-105 active:scale-95 transition-all flex items-center justify-center relative group"
      >
        <CheckCircle2 className="w-6 h-6" />
        <div className="absolute inset-0 rounded-full border border-inverted/20 animate-ping group-hover:hidden" />
      </button>
    </div>
  );
}
