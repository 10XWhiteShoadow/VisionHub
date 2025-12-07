import { Link } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  path: string;
  color: "cyan" | "purple" | "pink" | "green" | "orange";
  index: number;
}

const colorClasses = {
  cyan: {
    border: "hover:border-neon-cyan/50",
    glow: "group-hover:glow-cyan",
    icon: "text-neon-cyan",
    bg: "bg-neon-cyan/10",
    gradient: "from-neon-cyan/20 to-transparent",
  },
  purple: {
    border: "hover:border-neon-purple/50",
    glow: "group-hover:glow-purple",
    icon: "text-neon-purple",
    bg: "bg-neon-purple/10",
    gradient: "from-neon-purple/20 to-transparent",
  },
  pink: {
    border: "hover:border-neon-pink/50",
    glow: "group-hover:glow-pink",
    icon: "text-neon-pink",
    bg: "bg-neon-pink/10",
    gradient: "from-neon-pink/20 to-transparent",
  },
  green: {
    border: "hover:border-neon-green/50",
    glow: "group-hover:glow-green",
    icon: "text-neon-green",
    bg: "bg-neon-green/10",
    gradient: "from-neon-green/20 to-transparent",
  },
  orange: {
    border: "hover:border-neon-orange/50",
    glow: "group-hover:glow-orange",
    icon: "text-neon-orange",
    bg: "bg-neon-orange/10",
    gradient: "from-neon-orange/20 to-transparent",
  },
};

/**
 * Feature card component for the landing page
 * Displays a feature with icon, title, description, and animated effects
 */
export function FeatureCard({
  title,
  description,
  icon: Icon,
  path,
  color,
  index,
}: FeatureCardProps) {
  const colors = colorClasses[color];

  return (
    <Link to={path}>
      <div
        className={cn(
          "group relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 backdrop-blur-lg p-6",
          "transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1",
          colors.border,
          colors.glow
        )}
        style={{
          animationDelay: `${index * 100}ms`,
        }}
      >
        {/* Gradient overlay */}
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
            colors.gradient
          )}
        />

        {/* Scanline effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent h-full animate-scan" />
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Icon container */}
          <div
            className={cn(
              "w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all duration-300",
              colors.bg,
              "group-hover:scale-110"
            )}
          >
            <Icon className={cn("w-7 h-7 transition-all duration-300", colors.icon)} />
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold mb-2 text-foreground group-hover:text-primary transition-colors duration-300">
            {title}
          </h3>

          {/* Description */}
          <p className="text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>

          {/* Arrow indicator */}
          <div className="mt-4 flex items-center gap-2 text-sm font-medium text-muted-foreground group-hover:text-primary transition-all duration-300">
            <span>Try it now</span>
            <span className="transform group-hover:translate-x-1 transition-transform duration-300">
              →
            </span>
          </div>
        </div>

        {/* Corner decoration */}
        <div
          className={cn(
            "absolute top-0 right-0 w-20 h-20 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
            "bg-gradient-to-bl",
            colors.gradient
          )}
        />
      </div>
    </Link>
  );
}
