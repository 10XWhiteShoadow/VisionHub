import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Scan, Hand, Package, Activity, FileText, Github, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
interface LayoutProps {
  children: ReactNode;
}
const navItems = [{
  path: "/",
  icon: Home,
  label: "Home"
}, {
  path: "/face-detection",
  icon: Scan,
  label: "Face"
}, {
  path: "/hand-gesture",
  icon: Hand,
  label: "Hands"
}, {
  path: "/object-detection",
  icon: Package,
  label: "Objects"
}, {
  path: "/pose-estimation",
  icon: Activity,
  label: "Pose"
}, {
  path: "/ocr",
  icon: FileText,
  label: "OCR"
}, {
  path: "/attendance",
  icon: UserCheck,
  label: "Attendance"
}];

/**
 * Main layout component with navigation
 * Features a fixed header with navigation links and a main content area
 */
export function Layout({
  children
}: LayoutProps) {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  return <div className="min-h-screen bg-background">
      {/* Fixed navigation header */}
      <header className={cn("fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out", scrolled ? "bg-background/90 backdrop-blur-xl border-b border-border/50 shadow-lg shadow-background/10" : "bg-transparent")}>
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 opacity-0 animate-fade-in group">
              <div className="relative w-10 h-10 flex items-center justify-center">
                {/* Hexagon background */}
                <svg viewBox="0 0 40 40" className="w-full h-full">
                  <defs>
                    <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(var(--primary) / 0.7)" />
                    </linearGradient>
                  </defs>
                  {/* Hexagon */}
                  <polygon 
                    points="20,2 36,11 36,29 20,38 4,29 4,11" 
                    fill="url(#logoGradient)"
                    className="drop-shadow-lg"
                  />
                  {/* V shape */}
                  <path 
                    d="M12,12 L20,28 L28,12" 
                    fill="none" 
                    stroke="hsl(var(--primary-foreground))" 
                    strokeWidth="3" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="group-hover:stroke-[3.5] transition-all duration-300"
                  />
                </svg>
              </div>
              <div className="hidden sm:flex flex-col leading-none">
                <span className="font-black text-lg tracking-tight text-foreground">VISION</span>
                <span className="text-[10px] font-semibold tracking-[0.3em] text-primary">HUB</span>
              </div>
            </Link>

            {/* Navigation links with stagger animation */}
            <div className="flex items-center gap-1">
              {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return <Link key={item.path} to={item.path} className="opacity-0 animate-fade-in-down" style={{
                animationDelay: `${index * 50}ms`
              }}>
                    <Button variant={isActive ? "default" : "ghost"} size="sm" className={cn("gap-1.5 transition-all duration-300", isActive && "animate-pulse-glow shadow-lg", !isActive && "hover:scale-105 hover:bg-primary/10")}>
                      <Icon className={cn("w-4 h-4 transition-transform duration-300", !isActive && "group-hover:rotate-12")} />
                      <span className="hidden md:inline">{item.label}</span>
                    </Button>
                  </Link>;
            })}
            </div>

            {/* GitHub link with hover effect */}
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hidden sm:flex opacity-0 animate-fade-in" style={{
            animationDelay: "0.3s"
          }}>
              <Button variant="ghost" size="icon" className="transition-all duration-300 hover:scale-110 hover:rotate-12 hover:bg-primary/10">
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
    </div>;
}