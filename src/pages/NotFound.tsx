import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search, AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center max-w-lg mx-auto space-y-8">
          {/* Animated 404 */}
          <div className="relative">
            <div className="absolute inset-0 bg-neon-purple/20 blur-3xl rounded-full animate-pulse" />
            <h1 className="relative text-[150px] md:text-[200px] font-black leading-none gradient-text-cyber">
              404
            </h1>
          </div>

          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-2xl bg-neon-orange/20 flex items-center justify-center animate-bounce">
              <AlertTriangle className="w-10 h-10 text-neon-orange" />
            </div>
          </div>

          {/* Message */}
          <div className="space-y-3">
            <h2 className="text-2xl md:text-3xl font-bold">Page Not Found</h2>
            <p className="text-muted-foreground text-lg">
              The page <code className="px-2 py-1 bg-muted rounded text-primary">{location.pathname}</code> doesn't exist or has been moved.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              variant="gradient"
              size="lg"
              asChild
              className="gap-2 min-w-[160px]"
            >
              <Link to="/">
                <Home className="w-5 h-5" />
                Go Home
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => window.history.back()}
              className="gap-2 min-w-[160px]"
            >
              <ArrowLeft className="w-5 h-5" />
              Go Back
            </Button>
          </div>

          {/* Quick Links */}
          <div className="pt-8 border-t border-border/50">
            <p className="text-sm text-muted-foreground mb-4">Or try one of these:</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/face-detection" className="text-sm px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors">
                Face Detection
              </Link>
              <Link to="/hand-gesture" className="text-sm px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors">
                Hand Gesture
              </Link>
              <Link to="/object-detection" className="text-sm px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors">
                Object Detection
              </Link>
              <Link to="/docs" className="text-sm px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors">
                Documentation
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;
