import { ReactNode, useState, useEffect } from "react";
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed navigation header */}
      <header 
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out",
          scrolled 
            ? "bg-background/90 backdrop-blur-xl border-b border-border/50 shadow-lg shadow-background/10" 
            : "bg-transparent"
        )}
      >
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-between h-16">
            {/* Logo with hover animation */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-cyber flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 group-hover:shadow-lg group-hover:shadow-primary/30">
                <Scan className="w-5 h-5 text-primary-foreground transition-transform duration-300 group-hover:scale-110" />
              </div>
              <span className="text-xl font-bold text-gradient-animate hidden sm:inline">
                VisionHub
              </span>
            </Link>

            {/* Navigation links with stagger animation */}
            <div className="flex items-center gap-1">
              {navItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link 
                    key={item.path} 
                    to={item.path}
                    className="opacity-0 animate-fade-in-down"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "gap-1.5 transition-all duration-300",
                        isActive && "animate-pulse-glow shadow-lg",
                        !isActive && "hover:scale-105 hover:bg-primary/10"
                      )}
                    >
                      <Icon className={cn(
                        "w-4 h-4 transition-transform duration-300",
                        !isActive && "group-hover:rotate-12"
                      )} />
                      <span className="hidden md:inline">{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </div>

            {/* GitHub link with hover effect */}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex opacity-0 animate-fade-in"
              style={{ animationDelay: "0.3s" }}
            >
              <Button 
                variant="ghost" 
                size="icon"
                className="transition-all duration-300 hover:scale-110 hover:rotate-12 hover:bg-primary/10"
              >
                <Github className="w-5 h-5" />
              </Button>
            </a>
          </nav>
        </div>
      </header>

      {/* Main content area with page transition */}
      <main className="pt-16 animate-fade-in">
        {children}
      </main>
    </div>
  );
}
