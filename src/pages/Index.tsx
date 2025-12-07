import { Scan, Hand, Package, Activity, FileText, Sparkles, Zap, Shield, ChevronDown } from "lucide-react";
import { FeatureCard } from "@/components/FeatureCard";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

const features = [
  {
    title: "Face Detection & Emotion",
    description: "Real-time face detection with emotion recognition using MediaPipe. Detect multiple faces and their emotional states.",
    icon: Scan,
    path: "/face-detection",
    color: "cyan" as const,
  },
  {
    title: "Hand Gesture Recognition",
    description: "Track hand landmarks and recognize gestures. Play an interactive game using hand movements.",
    icon: Hand,
    path: "/hand-gesture",
    color: "purple" as const,
  },
  {
    title: "Object Detection",
    description: "Identify and count objects in real-time using COCO-SSD. Complete a scavenger hunt challenge!",
    icon: Package,
    path: "/object-detection",
    color: "pink" as const,
  },
  {
    title: "Pose Estimation",
    description: "Track your body pose and count exercises. Built-in workout counter for squats and pushups.",
    icon: Activity,
    path: "/pose-estimation",
    color: "green" as const,
  },
  {
    title: "OCR & Translation",
    description: "Extract text from images using Tesseract.js. Capture and translate text in real-time.",
    icon: FileText,
    path: "/ocr",
    color: "orange" as const,
  },
];

const highlights = [
  {
    icon: Zap,
    title: "Real-time Processing",
    description: "All processing happens locally in your browser with WebGL acceleration",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "No data leaves your device. All computer vision runs client-side",
  },
  {
    icon: Sparkles,
    title: "Hackathon Ready",
    description: "Production-quality demos with beautiful visuals and smooth performance",
  },
];

/**
 * Landing page for VisionHub
 * Features a hero section, feature cards grid, and highlights section
 */
export default function Index() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center">
        {/* Animated background effects */}
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="absolute inset-0 grid-pattern opacity-30" />
        
        {/* Morphing floating orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float animate-morph" />
        <div 
          className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float animate-morph" 
          style={{ animationDelay: "2s" }} 
        />
        <div 
          className="absolute top-1/2 left-1/4 w-48 h-48 bg-neon-pink/10 rounded-full blur-3xl animate-float" 
          style={{ animationDelay: "4s" }} 
        />

        {/* Particles overlay */}
        <div className="absolute inset-0 particles pointer-events-none" />

        <div className="container mx-auto px-4 py-32 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge with bounce animation */}
            <div 
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur border border-border/50 mb-8 ${
                mounted ? 'animate-scale-in-bounce' : 'opacity-0'
              }`}
            >
              <Sparkles className="w-4 h-4 text-primary animate-spin-slow" />
              <span className="text-sm font-medium text-muted-foreground">
                5 Interactive Computer Vision Demos
              </span>
            </div>

            {/* Main heading with staggered animation */}
            <h1 className={`text-5xl md:text-7xl font-bold mb-6 ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
              <span className="text-foreground">Explore </span>
              <span className="text-gradient-animate">Computer Vision</span>
              <br />
              <span 
                className="text-foreground inline-block"
                style={{ animationDelay: "0.2s" }}
              >
                In Your Browser
              </span>
            </h1>

            {/* Description with blur-in effect */}
            <p 
              className={`text-xl text-muted-foreground max-w-2xl mx-auto mb-10 ${
                mounted ? 'blur-in' : 'opacity-0'
              }`}
              style={{ animationDelay: "0.3s" }}
            >
              Real-time face detection, hand tracking, object recognition, pose estimation, and OCR — 
              all powered by TensorFlow.js and MediaPipe. No server required.
            </p>

            {/* CTA Buttons with hover effects */}
            <div 
              className={`flex flex-col sm:flex-row gap-4 justify-center ${
                mounted ? 'animate-fade-in-up' : 'opacity-0'
              }`}
              style={{ animationDelay: "0.4s" }}
            >
              <Button 
                className="group relative h-14 px-10 text-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/30" 
                asChild
              >
                <a href="#features">
                  <span className="relative z-10 flex items-center gap-2">
                    Start Exploring
                    <ChevronDown className="w-5 h-5 animate-bounce-subtle" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-secondary to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </a>
              </Button>
              <Button 
                className="group h-14 px-10 text-lg bg-card/50 backdrop-blur-lg border border-border/50 text-foreground transition-all duration-300 hover:bg-card/70 hover:border-primary/50 hover:scale-105" 
                asChild
              >
                <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                  <span className="group-hover:text-primary transition-colors duration-300">View on GitHub</span>
                </a>
              </Button>
            </div>

            {/* Scroll indicator */}
            <div 
              className={`mt-16 ${mounted ? 'animate-fade-in' : 'opacity-0'}`}
              style={{ animationDelay: "1s" }}
            >
              <a href="#features" className="inline-flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                <span className="text-sm">Scroll to explore</span>
                <div className="w-6 h-10 rounded-full border-2 border-current flex items-start justify-center p-2">
                  <div className="w-1 h-2 bg-current rounded-full animate-bounce-subtle" />
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 animate-fade-in-up">
              <span className="text-gradient-animate">Interactive Demos</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              Each demo is fully interactive with real-time processing. 
              Just allow camera access and start experimenting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <FeatureCard key={feature.path} {...feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/50 to-transparent" />
        
        {/* Animated background element */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-border/20 animate-spin-slow opacity-20" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-border/30 animate-spin-slow opacity-30" style={{ animationDirection: 'reverse', animationDuration: '12s' }} />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {highlights.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="group text-center p-6 rounded-2xl bg-card/30 backdrop-blur border border-border/30 opacity-0 animate-fade-in-up hover-lift transition-all duration-300 hover:border-primary/30"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/20 group-hover:rotate-6">
                    <Icon className="w-6 h-6 text-primary transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 transition-colors duration-300 group-hover:text-primary">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border/50 relative">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-cyber flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
                <Scan className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-gradient-animate">VisionHub</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built with TensorFlow.js, MediaPipe & Tesseract.js
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
