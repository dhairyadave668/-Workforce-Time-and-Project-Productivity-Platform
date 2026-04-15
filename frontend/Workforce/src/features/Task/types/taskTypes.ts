export type ApiTask = {
  id: string;
  name: string;
  priority: "Low" | "Medium" | "High";
  status: "Pending" | "In Progress" | "Completed";
  task_Hours: number;
  projectId: string | null;
  projectName: string | null;
  created_On: string;
};

export type TaskInput = {
  name: string;
  priority: "Low" | "Medium" | "High";
  status: "Pending" | "In Progress" | "Completed";
  task_Hours: number;
  projectId: string | null;
  entraId: string;
};