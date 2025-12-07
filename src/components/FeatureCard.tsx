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
    ring: "group-hover:ring-neon-cyan/30",
  },
  purple: {
    border: "hover:border-neon-purple/50",
    glow: "group-hover:glow-purple",
    icon: "text-neon-purple",
    bg: "bg-neon-purple/10",
    gradient: "from-neon-purple/20 to-transparent",
    ring: "group-hover:ring-neon-purple/30",
  },
  pink: {
    border: "hover:border-neon-pink/50",
    glow: "group-hover:glow-pink",
    icon: "text-neon-pink",
    bg: "bg-neon-pink/10",
    gradient: "from-neon-pink/20 to-transparent",
    ring: "group-hover:ring-neon-pink/30",
  },
  green: {
    border: "hover:border-neon-green/50",
    glow: "group-hover:glow-green",
    icon: "text-neon-green",
    bg: "bg-neon-green/10",
    gradient: "from-neon-green/20 to-transparent",
    ring: "group-hover:ring-neon-green/30",
  },
  orange: {
    border: "hover:border-neon-orange/50",
    glow: "group-hover:glow-orange",
    icon: "text-neon-orange",
    bg: "bg-neon-orange/10",
    gradient: "from-neon-orange/20 to-transparent",
    ring: "group-hover:ring-neon-orange/30",
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
    <Link to={path} className="block opacity-0 animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
      <div
        className={cn(
          "group relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 backdrop-blur-lg p-6",
          "transition-all duration-500 ease-out",
          "hover:scale-[1.03] hover:-translate-y-2",
          "hover:shadow-2xl hover:ring-4 ring-0",
          colors.border,
          colors.glow,
          colors.ring
        )}
      >
        {/* Animated gradient overlay */}
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100",
            "transition-opacity duration-700 ease-out",
            colors.gradient
          )}
        />

        {/* Animated scan line */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden pointer-events-none">
          <div className="absolute inset-x-0 h-20 bg-gradient-to-b from-transparent via-primary/10 to-transparent animate-scan" />
        </div>

        {/* Shimmer effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute inset-0 bg-shimmer animate-shimmer" />
        </div>

        {/* Corner sparkle */}
        <div className="absolute -top-1 -right-1 w-3 h-3 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-100 scale-0">
          <div className={cn("w-full h-full rounded-full", colors.bg, "animate-ping-slow")} />
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Icon container with bounce */}
          <div
            className={cn(
              "w-14 h-14 rounded-xl flex items-center justify-center mb-4",
              "transition-all duration-500 ease-out",
              "group-hover:scale-110 group-hover:rotate-3",
              colors.bg
            )}
          >
            <Icon className={cn(
              "w-7 h-7 transition-all duration-500",
              "group-hover:scale-110",
              colors.icon
            )} />
          </div>

          {/* Title with slide effect */}
          <h3 className={cn(
            "text-xl font-semibold mb-2 text-foreground",
            "transition-all duration-300 ease-out",
            "group-hover:text-primary group-hover:translate-x-1"
          )}>
            {title}
          </h3>

          {/* Description with fade */}
          <p className={cn(
            "text-muted-foreground text-sm leading-relaxed",
            "transition-all duration-300 delay-75",
            "group-hover:text-muted-foreground/80"
          )}>
            {description}
          </p>

          {/* Arrow indicator with spring animation */}
          <div className={cn(
            "mt-4 flex items-center gap-2 text-sm font-medium",
            "text-muted-foreground transition-all duration-300",
            "group-hover:text-primary group-hover:gap-3"
          )}>
            <span className="transition-transform duration-300 group-hover:translate-x-1">
              Try it now
            </span>
            <span className={cn(
              "transform transition-all duration-300 ease-out",
              "group-hover:translate-x-2 group-hover:scale-125"
            )}>
              →
            </span>
          </div>
        </div>

        {/* Floating corner decoration */}
        <div
          className={cn(
            "absolute top-0 right-0 w-24 h-24",
            "opacity-0 group-hover:opacity-100",
            "transition-all duration-500 ease-out",
            "translate-x-6 -translate-y-6 group-hover:translate-x-2 group-hover:-translate-y-2",
            "bg-gradient-to-bl rounded-full blur-xl",
            colors.gradient
          )}
        />

        {/* Bottom border glow */}
        <div className={cn(
          "absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5",
          "transition-all duration-500 ease-out",
          "group-hover:w-3/4",
          colors.bg
        )} />
      </div>
    </Link>
  );
}
