import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center px-4 overflow-hidden relative">
        {/* Background bubbles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-neon-cyan/10 animate-float"
              style={{
                width: `${Math.random() * 60 + 20}px`,
                height: `${Math.random() * 60 + 20}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${Math.random() * 10 + 10}s`,
              }}
            />
          ))}
        </div>

        {/* Fish swimming across */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div
              key={`fish-${i}`}
              className="absolute text-4xl"
              style={{
                top: `${20 + i * 15}%`,
                animation: `swim ${15 + i * 3}s linear infinite`,
                animationDelay: `${i * 3}s`,
              }}
            >
              🐟
            </div>
          ))}
        </div>

        <div className="text-center max-w-2xl mx-auto space-y-6 relative z-10">
          {/* Fishing Scene */}
          <div className="relative h-64 md:h-80 mb-8">
            {/* Water waves */}
            <div className="absolute bottom-0 left-0 right-0 h-24 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-neon-cyan/20 to-transparent" />
              <svg className="absolute bottom-0 w-full" viewBox="0 0 1200 120" preserveAspectRatio="none">
                <path
                  d="M0,60 C150,120 350,0 600,60 C850,120 1050,0 1200,60 L1200,120 L0,120 Z"
                  className="fill-neon-cyan/10 animate-pulse"
                />
              </svg>
              <svg className="absolute bottom-0 w-full" viewBox="0 0 1200 120" preserveAspectRatio="none" style={{ animationDelay: '0.5s' }}>
                <path
                  d="M0,80 C200,40 400,120 600,80 C800,40 1000,120 1200,80 L1200,120 L0,120 Z"
                  className="fill-neon-purple/10 animate-pulse"
                />
              </svg>
            </div>

            {/* Character fishing */}
            <div className="absolute left-1/2 -translate-x-1/2 top-0">
              {/* Character */}
              <div className="relative animate-bounce" style={{ animationDuration: '3s' }}>
                <div className="text-8xl md:text-9xl">🧑‍🚀</div>
                
                {/* Fishing rod */}
                <div className="absolute -right-8 top-12 origin-top-left" style={{ transform: 'rotate(45deg)' }}>
                  <div className="w-1 h-32 bg-gradient-to-b from-amber-600 to-amber-800 rounded-full" />
                  {/* Fishing line */}
                  <div 
                    className="absolute top-32 left-0 w-px bg-muted-foreground/50"
                    style={{ 
                      height: '80px',
                      animation: 'fishing-line 2s ease-in-out infinite',
                    }}
                  />
                  {/* Hook with 404 */}
                  <div 
                    className="absolute left-1/2 -translate-x-1/2"
                    style={{ 
                      top: 'calc(32px + 80px)',
                      animation: 'hook-bob 2s ease-in-out infinite',
                    }}
                  >
                    <span className="text-2xl font-bold text-neon-orange animate-pulse">🪝</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating elements in water */}
            <div className="absolute bottom-4 left-1/4 text-3xl animate-float" style={{ animationDelay: '0s' }}>🐠</div>
            <div className="absolute bottom-8 right-1/4 text-2xl animate-float" style={{ animationDelay: '1s' }}>🦑</div>
            <div className="absolute bottom-2 left-1/3 text-xl animate-float" style={{ animationDelay: '2s' }}>🐡</div>
            <div className="absolute bottom-6 right-1/3 text-3xl animate-float" style={{ animationDelay: '0.5s' }}>🦀</div>
            <div className="absolute bottom-10 left-1/2 text-2xl animate-float" style={{ animationDelay: '1.5s' }}>🐙</div>
          </div>

          {/* Animated 404 */}
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-neon-purple/30 blur-3xl rounded-full animate-pulse" />
            <h1 className="relative text-[100px] md:text-[150px] font-black leading-none gradient-text-cyber animate-pulse">
              404
            </h1>
          </div>

          {/* Message */}
          <div className="space-y-3 animate-fade-in">
            <h2 className="text-2xl md:text-3xl font-bold">Lost in the Digital Ocean!</h2>
            <p className="text-muted-foreground text-lg">
              Our astronaut is fishing for <code className="px-2 py-1 bg-muted rounded text-primary">{location.pathname}</code> but it seems to have swum away...
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Button
              variant="gradient"
              size="lg"
              asChild
              className="gap-2 min-w-[160px] hover-scale"
            >
              <Link to="/">
                <Home className="w-5 h-5" />
                Swim Home
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => window.history.back()}
              className="gap-2 min-w-[160px] hover-scale"
            >
              <ArrowLeft className="w-5 h-5" />
              Go Back
            </Button>
          </div>

          {/* Quick Links */}
          <div className="pt-8 border-t border-border/50 animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <p className="text-sm text-muted-foreground mb-4">Or explore these waters:</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/face-detection" className="text-sm px-4 py-2 rounded-full bg-muted hover:bg-neon-cyan/20 hover:text-neon-cyan transition-all duration-300 hover-scale">
                🎭 Face Detection
              </Link>
              <Link to="/hand-gesture" className="text-sm px-4 py-2 rounded-full bg-muted hover:bg-neon-purple/20 hover:text-neon-purple transition-all duration-300 hover-scale">
                ✋ Hand Gesture
              </Link>
              <Link to="/object-detection" className="text-sm px-4 py-2 rounded-full bg-muted hover:bg-neon-pink/20 hover:text-neon-pink transition-all duration-300 hover-scale">
                📦 Object Detection
              </Link>
              <Link to="/docs" className="text-sm px-4 py-2 rounded-full bg-muted hover:bg-neon-orange/20 hover:text-neon-orange transition-all duration-300 hover-scale">
                📚 Documentation
              </Link>
            </div>
          </div>
        </div>

        {/* Custom keyframes */}
        <style>{`
          @keyframes swim {
            0% { left: -10%; transform: scaleX(1); }
            49% { transform: scaleX(1); }
            50% { left: 110%; transform: scaleX(-1); }
            99% { transform: scaleX(-1); }
            100% { left: -10%; transform: scaleX(1); }
          }
          
          @keyframes fishing-line {
            0%, 100% { height: 80px; }
            50% { height: 100px; }
          }
          
          @keyframes hook-bob {
            0%, 100% { transform: translateX(-50%) translateY(0); }
            50% { transform: translateX(-50%) translateY(20px); }
          }
        `}</style>
      </div>
    </Layout>
  );
};

export default NotFound;
