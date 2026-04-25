import { useState } from "react";
import { useTask } from "../context/TaskContext";
import { StatusDot, Badge, EmptyState, Spinner } from "./UI";

import {
  getPriorityClass,
  statusLabel,
  dueDateLabel,
  isOverdue,
} from "../utils/helpers";
import { CheckSquare } from "lucide-react";
import { formatTime } from "../utils/helpers";

export default function TaskTable({
  tasks,
  loading,
  emptyTitle = "No tasks",
  emptySubtitle = "",
  onRowClick
}) {
  const { categories, allUsers } = useTask();

  if (loading) {
    return (
      <div className="card overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-12 border-b border-gray-50 px-4 flex items-center gap-4 animate-pulse"
          >
            <div className="h-3 bg-gray-100 rounded flex-1" />
            <div className="h-3 bg-gray-100 rounded w-20" />
            <div className="h-3 bg-gray-100 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={CheckSquare}
        title={emptyTitle}
        subtitle={emptySubtitle}
      />
    );
  }

  return (
    
      <div className="relative">
        <div className="flex-1 min-w-0 card overflow-hidden">
          <table className="data-table w-full" style={{ tableLayout: "fixed" }}>
            <thead>
              <tr>
                <th style={{ width: "36%" }}>Task</th>
                <th style={{ width: "14%" }}>Category</th>
                <th style={{ width: "12%" }}>Priority</th>
                <th style={{ width: "16%" }}>Status</th>
                <th style={{ width: "12%" }}>Due</th>
                <th style={{ width: "10%" }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const cat = categories.find((c) => c.id === task.categoryId);
                const creator = allUsers.find(
                  (u) => u.id === task.createdByUserId,
                );
                const due = dueDateLabel(task.dueDate);
                const overdue = isOverdue(task.dueDate, task.status);

                return (
                  <tr
                    key={task.id}
                    onClick={() => onRowClick?.(task)}
                    
                  >
                    <td className="font-medium text-gray-800 truncate">
                      {task.title}
                    </td>
                    <td>
                      {cat ? (
                        <span
                          className="badge text-[10px] px-1.5 py-0.5"
                          style={{
                            background: cat.color,
                            color: cat.textColor,
                          }}
                        >
                          {cat.name}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td>
                      <Badge className={getPriorityClass(task.priority)}>
                        {task.priority}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <StatusDot status={task.status} />
                        <span className="text-xs text-gray-600">
                          {statusLabel(task.status)}
                        </span>
                      </div>
                    </td>
                    <td>
                      {task.status === "Completed" ? (
                        <span className="text-xs font-medium text-green-600">
                          Completed
                        </span>
                      ) : task.status === "Cancelled" ? (
                        <span className="text-xs font-medium text-gray-400">
                          Cancelled
                        </span>
                      ) : due ? (
                        <span
                          className={`text-xs font-medium ${
                            overdue ? "text-red-500" : "text-gray-500"
                          }`}
                        >
                          {due}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td>
                      <span className="text-xs text-gray-400 truncate">
                        {formatTime(task?.dueDate)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
  );
}
