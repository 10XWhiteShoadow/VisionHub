import { Scan, Hand, Package, Activity, FileText, Sparkles, Zap, Shield } from "lucide-react";
import { FeatureCard } from "@/components/FeatureCard";
import { Button } from "@/components/ui/button";

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
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="absolute inset-0 grid-pattern opacity-30" />
        
        {/* Floating orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />

        <div className="container mx-auto px-4 pt-32 pb-20 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur border border-border/50 mb-8 animate-fade-in">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">
                5 Interactive Computer Vision Demos
              </span>
            </div>

            {/* Main heading */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in-up">
              <span className="text-foreground">Explore </span>
              <span className="gradient-text-cyber">Computer Vision</span>
              <br />
              <span className="text-foreground">In Your Browser</span>
            </h1>

            {/* Description */}
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              Real-time face detection, hand tracking, object recognition, pose estimation, and OCR — 
              all powered by TensorFlow.js and MediaPipe. No server required.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              <Button className="h-14 px-10 text-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-[1.02]" asChild>
                <a href="#features">Start Exploring</a>
              </Button>
              <Button className="h-14 px-10 text-lg bg-card/50 backdrop-blur-lg border border-border/50 text-foreground hover:bg-card/70" asChild>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                  View on GitHub
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="gradient-text-cyber">Interactive Demos</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
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
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/50 to-transparent" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {highlights.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="text-center p-6 rounded-2xl bg-card/30 backdrop-blur border border-border/30"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-cyber flex items-center justify-center">
                <Scan className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold gradient-text-cyber">VisionHub</span>
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
