export type Priority = "Low" | "Medium" | "High";
export type Status = "pending" | "completed";

export interface Task {
  id: string;
  title: string;
  dueDate: string | null;
  priority: Priority;
  status: Status;
  userId: string;
  createdAt: number;
  updatedAt: number;
}
