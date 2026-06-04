import React, { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Check, Calendar, AlertCircle, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { Task } from "../types";
import { cn } from "../lib/utils";

interface TaskItemProps {
  task: Task;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const isCompleted = task.status === "completed";

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const priorityColors = {
    Low: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    Medium: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    High: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  };

  const submitEdit = () => {
    if (editTitle.trim() && editTitle !== task.title) {
      onUpdate(task.id, { title: editTitle.trim() });
    } else {
      setEditTitle(task.title);
    }
    setIsEditing(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.01 }}
      className={cn(
        "group flex items-center gap-4 p-4 rounded-2xl border transition-all shadow-sm",
        task.priority === "High" && !isCompleted ? "border-red-500/30 bg-red-500/5 dark:bg-red-500/10" : "bg-card border-border",
        isCompleted && "opacity-50"
      )}
    >
      <button
        onClick={() => onUpdate(task.id, { status: isCompleted ? "pending" : "completed" })}
        className={cn(
          "w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors",
          isCompleted ? "bg-primary border-primary" : "border-foreground/20 hover:border-primary"
        )}
      >
        <Check className={cn("w-3 h-3 text-white transition-opacity", isCompleted ? "opacity-100" : "opacity-0")} />
      </button>

      <div className="flex-1 min-w-0" onClick={() => !isCompleted && setIsEditing(true)}>
        {isEditing ? (
          <input
            ref={inputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={submitEdit}
            onKeyDown={(e) => e.key === "Enter" && submitEdit()}
            className="w-full bg-transparent text-base font-medium outline-none text-foreground border-b border-foreground/20 pb-0.5 mb-[3px]"
          />
        ) : (
          <h3 className={cn("text-base font-medium truncate cursor-text text-foreground", isCompleted && "line-through text-muted cursor-default")}>
            {task.title}
          </h3>
        )}
        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted">
          <span className={cn("px-2 py-0.5 rounded-full border", priorityColors[task.priority])}>
            {task.priority}
          </span>
          {task.dueDate && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{task.dueDate}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => onDelete(task.id)}
          className="p-2 text-muted hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
