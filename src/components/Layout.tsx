import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Scan, Hand, Package, Activity, FileText, Github } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/face-detection", icon: Scan, label: "Face" },
  { path: "/hand-gesture", icon: Hand, label: "Hands" },
  { path: "/object-detection", icon: Package, label: "Objects" },
  { path: "/pose-estimation", icon: Activity, label: "Pose" },
  { path: "/ocr", icon: FileText, label: "OCR" },
];

/**
 * Main layout component with navigation
 * Features a fixed header with navigation links and a main content area
 */
export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed navigation header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-cyber flex items-center justify-center">
                <Scan className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold gradient-text-cyber hidden sm:inline">
                VisionHub
              </span>
            </Link>

            {/* Navigation links */}
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "gap-1.5",
                        isActive && "animate-pulse-glow"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden md:inline">{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </div>

            {/* GitHub link */}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex"
            >
              <Button variant="ghost" size="icon">
                <Github className="w-5 h-5" />
              </Button>
            </a>
          </nav>
        </div>
      </header>

      {/* Main content area */}
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
}
