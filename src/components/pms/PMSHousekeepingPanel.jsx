import { useMemo } from "react";
import { HOUSEKEEPING_STAFF, deriveHousekeepingTasks } from "../../lib/housekeeping";
import Card from "../ui/Card";

const STATUS_META = {
  dirty: { label: "Dirty", tone: "bg-red-100 text-red-700", emoji: "⚠️" },
  "in-progress": { label: "In progress", tone: "bg-yellow-100 text-yellow-700", emoji: "🧽" },
  clean: { label: "Clean", tone: "bg-green-100 text-green-700", emoji: "✅" },
};

export default function PMSHousekeepingPanel({ rooms = [], reservations = [], staff = HOUSEKEEPING_STAFF, onStatusChange }) {
  const { tasks } = useMemo(
    () => deriveHousekeepingTasks(rooms, reservations, staff),
    [rooms, reservations, staff]
  );

  const summary = useMemo(
    () => ({
      dirty: tasks.filter((task) => task.status === "dirty").length,
      inProgress: tasks.filter((task) => task.status === "in-progress").length,
      clean: Math.max(0, rooms.length - tasks.length),
    }),
    [tasks, rooms.length]
  );

  const updateStatus = (task, status) => {
    onStatusChange?.({ roomId: task.roomId, status, task: { ...task, status } });
  };

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Housekeeping workflow</h2>
          <p className="text-sm text-slate-500">Automatic turnover after checkout · staff rotation</p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="rounded-full bg-red-100 px-2 py-1 text-red-700">{summary.dirty} dirty</span>
          <span className="rounded-full bg-yellow-100 px-2 py-1 text-yellow-700">{summary.inProgress} in progress</span>
          <span className="rounded-full bg-green-100 px-2 py-1 text-green-700">{summary.clean} clean</span>
        </div>
      </div>

      {tasks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">All rooms are clean. No housekeeping tasks pending.</p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 transition-colors duration-150 hover:border-slate-300 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-medium text-slate-900">Room {task.room}</div>
                <div className="text-sm text-slate-500">{task.task} · {task.assigned} · due {task.dueAt}</div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_META[task.status].tone}`}>
                  {STATUS_META[task.status].emoji} {STATUS_META[task.status].label}
                </span>
                <select
                  value={task.status}
                  onChange={(event) => updateStatus(task, event.target.value)}
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-cyan-600 focus:outline-none focus:ring-4 focus:ring-cyan-100"
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
      )}
    </Card>
  );
}
