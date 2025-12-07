import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  message?: string;
  subMessage?: string;
  className?: string;
}

/**
 * Loading state component with animated spinner
 * Used while models are being loaded
 */
export function LoadingState({
  message = "Loading...",
  subMessage,
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center min-h-[400px] p-8",
        className
      )}
    >
      {/* Animated loader */}
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-2 border-primary/20" />
        <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <Loader2 className="absolute inset-0 m-auto w-6 h-6 text-primary animate-pulse" />
      </div>

      {/* Loading message */}
      <p className="mt-6 text-lg font-medium text-foreground">{message}</p>
      {subMessage && (
        <p className="mt-2 text-sm text-muted-foreground">{subMessage}</p>
      )}

      {/* Animated dots */}
      <div className="flex gap-1 mt-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-primary/50 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
