import type { TaskStats } from "../api/types";

export function StatsPanel({ stats }: { stats: TaskStats | null }) {
  const metrics = [
    ["Total", stats?.total ?? "-"],
    ["Completed", stats?.completed ?? "-"],
    ["In progress", stats?.in_progress ?? "-"],
    ["Pending", stats?.pending ?? "-"],
  ];

  return (
    <section className="stats-grid" aria-label="Task statistics">
      {metrics.map(([label, value]) => (
        <div className="metric-card" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </section>
  );
}
