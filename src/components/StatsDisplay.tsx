import { cn } from "@/lib/utils";

interface Stat {
  label: string;
  value: string | number;
  color?: "cyan" | "purple" | "pink" | "green" | "orange";
}

interface StatsDisplayProps {
  stats: Stat[];
  className?: string;
}

const colorClasses = {
  cyan: "text-neon-cyan border-neon-cyan/30",
  purple: "text-neon-purple border-neon-purple/30",
  pink: "text-neon-pink border-neon-pink/30",
  green: "text-neon-green border-neon-green/30",
  orange: "text-neon-orange border-neon-orange/30",
};

/**
 * Stats display component for showing metrics
 * Used across all feature pages to display real-time statistics
 */
export function StatsDisplay({ stats, className }: StatsDisplayProps) {
  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      {stats.map((stat, index) => (
        <div
          key={index}
          className={cn(
            "stats-badge",
            stat.color ? colorClasses[stat.color] : "text-foreground border-border"
          )}
        >
          <span className="text-muted-foreground text-xs">{stat.label}</span>
          <span className="font-semibold">{stat.value}</span>
        </div>
      ))}
    </div>
  );
}
