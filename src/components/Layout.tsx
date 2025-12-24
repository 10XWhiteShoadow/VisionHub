import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Scan, Hand, Package, Activity, FileText, Github, UserCheck, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
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
              <div className="relative w-11 h-11">
                {/* Outer glow ring */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary via-secondary to-primary opacity-20 blur-md group-hover:opacity-40 transition-opacity duration-300" />
                
                {/* Main container */}
                <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-primary to-secondary p-[2px] group-hover:scale-105 transition-transform duration-300">
                  <div className="w-full h-full rounded-2xl bg-background flex items-center justify-center overflow-hidden">
                    {/* Inner gradient bg */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10" />
                    
                    {/* Eye icon with scanning effect */}
                    <div className="relative z-10">
                      <Eye className="w-6 h-6 text-primary group-hover:text-secondary transition-colors duration-300" strokeWidth={2.5} />
                      {/* Scanning dot */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary group-hover:bg-secondary animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="hidden sm:flex flex-col leading-none">
                <span className="font-black text-xl tracking-tight gradient-text-cyber">VISION</span>
                <span className="text-xs font-bold tracking-[0.2em] text-muted-foreground">HUB</span>
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

            {/* Right side actions */}
            <div className="flex items-center gap-2 opacity-0 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <ThemeToggle />
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hidden sm:flex">
                <Button variant="ghost" size="icon" className="transition-all duration-300 hover:scale-110 hover:rotate-12 hover:bg-primary/10">
                  <Github className="w-5 h-5" />
                </Button>
              </a>
            </div>
          </nav>
        </div>
      </header>

      {/* Main content area with page transition */}
      <main className="pt-16 animate-fade-in">
        {children}
      </main>
    </div>;
}