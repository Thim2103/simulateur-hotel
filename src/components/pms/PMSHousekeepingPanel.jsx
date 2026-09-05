import { useMemo, useState } from "react";

const DEFAULT_TASKS = [
  { id: 1, room: "101", status: "dirty", assigned: "Sophie", task: "Full clean" },
  { id: 2, room: "204", status: "in-progress", assigned: "Marc", task: "Change linens" },
  { id: 3, room: "301", status: "clean", assigned: "Julie", task: "Inspection" },
  { id: 4, room: "415", status: "dirty", assigned: "Lina", task: "Deep clean" },
];

const STATUS_META = {
  dirty: { label: "Dirty", tone: "bg-red-100 text-red-700", emoji: "⚠️" },
  "in-progress": { label: "In progress", tone: "bg-yellow-100 text-yellow-700", emoji: "🧽" },
  clean: { label: "Clean", tone: "bg-green-100 text-green-700", emoji: "✅" },
};

export default function PMSHousekeepingPanel({ initialTasks = DEFAULT_TASKS, onStatusChange }) {
  const [tasks, setTasks] = useState(initialTasks);

  const summary = useMemo(
    () => ({
      dirty: tasks.filter((task) => task.status === "dirty").length,
      inProgress: tasks.filter((task) => task.status === "in-progress").length,
      clean: tasks.filter((task) => task.status === "clean").length,
    }),
    [tasks]
  );

  const updateStatus = (taskId, status) => {
    setTasks((current) => {
      const nextTasks = current.map((task) => (task.id === taskId ? { ...task, status } : task));
      const nextTask = nextTasks.find((task) => task.id === taskId);
      onStatusChange?.({ task: nextTask, summary: {
        dirty: nextTasks.filter((task) => task.status === "dirty").length,
        inProgress: nextTasks.filter((task) => task.status === "in-progress").length,
      } });
      return nextTasks;
    });
  };

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Housekeeping workflow</h2>
          <p className="text-sm text-gray-500">Cleaning status: dirty / clean / in-progress</p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="rounded-full bg-red-100 px-2 py-1 text-red-700">{summary.dirty} dirty</span>
          <span className="rounded-full bg-yellow-100 px-2 py-1 text-yellow-700">{summary.inProgress} in progress</span>
          <span className="rounded-full bg-green-100 px-2 py-1 text-green-700">{summary.clean} clean</span>
        </div>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <div key={task.id} className="flex flex-col gap-2 rounded-lg border p-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-medium">Room {task.room}</div>
              <div className="text-sm text-gray-500">{task.task} · {task.assigned}</div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_META[task.status].tone}`}>
                {STATUS_META[task.status].emoji} {STATUS_META[task.status].label}
              </span>
              <select
                value={task.status}
                onChange={(event) => updateStatus(task.id, event.target.value)}
                className="rounded-md border px-2 py-1 text-sm"
                aria-label={`Update housekeeping status for room ${task.room}`}
              >
                <option value="dirty">Dirty</option>
                <option value="in-progress">In progress</option>
                <option value="clean">Clean</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
