import { Layout } from "@/components/Layout";
import { 
  Scan, 
  Hand, 
  Package, 
  Activity, 
  FileText, 
  ImageMinus, 
  UserCheck,
  Sparkles,
  Zap,
  Shield,
  Globe,
  Code2,
  Cpu,
  Database,
  Cloud,
  CheckCircle2,
  Users,
  GraduationCap,
  Building2,
  Camera,
  Mic,
  FileSpreadsheet,
  Layers,
  Brain,
  Eye,
  Flame,
  ExternalLink,
  ChevronRight,
  Target,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import visionHubLogo from "@/assets/visionhub-logo.png";

const handleExportPDF = () => {
  window.print();
};

interface FeatureDetailProps {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  path: string;
  features: string[];
  useCases: string[];
  techStack: string[];
}

function FeatureDetail({ icon: Icon, title, description, color, path, features, useCases, techStack }: FeatureDetailProps) {
  return (
    <div className="group relative p-6 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm hover:border-primary/30 transition-all duration-300">
      {/* Glow effect */}
      <div className={cn(
        "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-2xl",
        color
      )} />
      
      <div className="flex items-start gap-4 mb-4">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
          color
        )}>
          <Icon className="w-6 h-6 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-1">{title}</h3>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        <Link 
          to={path}
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Try it <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="w-3 h-3" /> Features
          </h4>
          <ul className="space-y-1">
            {features.map((f, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-1">•</span> {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Target className="w-3 h-3" /> Use Cases
          </h4>
          <ul className="space-y-1">
            {useCases.map((u, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-secondary mt-1">•</span> {u}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Code2 className="w-3 h-3" /> Technologies
          </h4>
          <div className="flex flex-wrap gap-1">
            {techStack.map((t, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-full bg-muted/50 text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const features: FeatureDetailProps[] = [
  {
    icon: Scan,
    title: "Face Detection & Emotion Recognition",
    description: "Real-time face detection with deep learning-based emotion classification from facial expressions.",
    color: "bg-neon-cyan",
    path: "/face-detection",
    features: [
      "Multi-face detection support",
      "7 emotion classifications",
      "68 facial landmark tracking",
      "Confidence score display",
      "Stabilized output for smooth UX"
    ],
    useCases: [
      "Mental health monitoring",
      "Customer sentiment analysis",
      "Interactive gaming",
      "Security & surveillance",
      "Educational feedback systems"
    ],
    techStack: ["face-api.js", "TensorFlow.js", "WebGL", "Canvas API"]
  },
  {
    icon: Hand,
    title: "Hand Gesture Recognition",
    description: "Track 21 hand landmarks in 3D space and recognize gestures for interactive applications.",
    color: "bg-neon-purple",
    path: "/hand-gesture",
    features: [
      "21 landmark detection per hand",
      "3D coordinate tracking",
      "Rock Paper Scissors game",
      "Multi-hand support",
      "Real-time gesture classification"
    ],
    useCases: [
      "Sign language translation",
      "Touchless interfaces",
      "Gaming & entertainment",
      "Accessibility tools",
      "Virtual reality control"
    ],
    techStack: ["MediaPipe", "TensorFlow Lite", "WebGPU", "WASM"]
  },
  {
    icon: Package,
    title: "Object Detection",
    description: "Identify and locate 80 different object categories using Single Shot Detection architecture.",
    color: "bg-neon-pink",
    path: "/object-detection",
    features: [
      "80 COCO object classes",
      "Real-time bounding boxes",
      "Confidence thresholding",
      "Scavenger hunt game mode",
      "Object counting"
    ],
    useCases: [
      "Inventory management",
      "Retail analytics",
      "Security monitoring",
      "Autonomous vehicles",
      "Quality inspection"
    ],
    techStack: ["COCO-SSD", "MobileNetV2", "TensorFlow.js", "WebGL"]
  },
  {
    icon: Activity,
    title: "Pose Estimation & Exercise Counter",
    description: "Track 33 body keypoints to analyze posture and automatically count exercise repetitions.",
    color: "bg-neon-green",
    path: "/pose-estimation",
    features: [
      "33 body landmark tracking",
      "Joint angle calculation",
      "Automatic rep counting",
      "Multiple exercise types",
      "Form guidance feedback"
    ],
    useCases: [
      "Home fitness coaching",
      "Physical therapy",
      "Sports performance analysis",
      "Ergonomic assessment",
      "Dance training"
    ],
    techStack: ["MediaPipe Pose", "BlazePose", "WebGPU", "JavaScript Math"]
  },
  {
    icon: FileText,
    title: "OCR & AI-Enhanced Translation",
    description: "Extract text from images using Tesseract.js with AI-powered correction and translation.",
    color: "bg-neon-orange",
    path: "/ocr",
    features: [
      "Real-time text capture",
      "AI spelling correction",
      "Multi-language translation",
      "Image preprocessing",
      "Copy to clipboard"
    ],
    useCases: [
      "Document digitization",
      "Real-time translation",
      "Accessibility for visually impaired",
      "Data entry automation",
      "Language learning"
    ],
    techStack: ["Tesseract.js", "Gemini AI", "Canvas API", "Edge Functions"]
  },
  {
    icon: ImageMinus,
    title: "AI Background Removal",
    description: "Remove backgrounds from images using transformer-based segmentation with manual refinement tools.",
    color: "bg-neon-purple",
    path: "/background-removal",
    features: [
      "One-click removal",
      "Brush-based refinement",
      "Background replacement",
      "Undo/redo support",
      "History tracking"
    ],
    useCases: [
      "E-commerce product photos",
      "Social media content",
      "ID photo preparation",
      "Marketing materials",
      "Creative design"
    ],
    techStack: ["Transformers.js", "RMBG-1.4", "Canvas API", "WebGPU"]
  },
  {
    icon: UserCheck,
    title: "Smart Attendance Management",
    description: "Face recognition-based attendance system with cloud sync and voice announcements.",
    color: "bg-neon-cyan",
    path: "/attendance",
    features: [
      "Face-based auto-recognition",
      "Voice announcements",
      "Google Sheets sync",
      "Student management",
      "Attendance history & export"
    ],
    useCases: [
      "Classroom attendance",
      "Corporate check-in",
      "Event management",
      "Training sessions",
      "Contactless verification"
    ],
    techStack: ["face-api.js", "Supabase", "Google Sheets API", "Web Speech API"]
  }
];

const techStackOverview = [
  { category: "Frontend", items: ["React 18", "TypeScript", "Tailwind CSS", "Vite", "React Router"] },
  { category: "Computer Vision", items: ["TensorFlow.js", "MediaPipe", "face-api.js", "COCO-SSD", "Tesseract.js"] },
  { category: "AI/ML", items: ["Transformers.js", "Gemini AI", "WebGL/WebGPU", "WASM"] },
  { category: "Backend", items: ["Supabase", "Edge Functions", "PostgreSQL", "Row Level Security"] },
  { category: "Integrations", items: ["Google Sheets API", "Web Speech API", "Canvas API", "WebRTC"] }
];

const teamMembers = [
  { name: "Team FireFlies", role: "Development Team" }
];

export default function Documentation() {
  return (
    <Layout>
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative py-20 overflow-hidden">
          {/* Background effects */}
          <div className="absolute inset-0 bg-hero-gradient" />
          <div className="absolute inset-0 grid-pattern opacity-20" />
          <div className="absolute top-20 left-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-10 right-10 w-72 h-72 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              {/* Event Badge */}
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-card/50 backdrop-blur border border-border/50 mb-8 animate-scale-in">
                <Flame className="w-5 h-5 text-neon-orange animate-pulse" />
                <span className="font-bold text-lg">Tech Expo 2026</span>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">Team FireFlies</span>
              </div>

              {/* Logo & Title */}
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-cyber flex items-center justify-center shadow-lg shadow-primary/30">
                  <Scan className="w-10 h-10 text-primary-foreground" />
                </div>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-black mb-6">
                <span className="text-gradient-animate">VisionHub</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed">
                A comprehensive computer vision platform featuring <span className="text-primary font-semibold">7 interactive demos</span> showcasing 
                real-time AI-powered image processing, all running directly in your browser.
              </p>

              {/* Quick Stats */}
              <div className="flex flex-wrap justify-center gap-6 mb-10">
                {[
                  { icon: Eye, label: "7 CV Features", value: "Interactive" },
                  { icon: Zap, label: "Real-time", value: "Processing" },
                  { icon: Shield, label: "Privacy First", value: "Client-side" },
                  { icon: Globe, label: "No Server", value: "Required" }
                ].map((stat, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3 rounded-xl bg-card/30 backdrop-blur border border-border/30">
                    <stat.icon className="w-5 h-5 text-primary" />
                    <div className="text-left">
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className="font-bold">{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="flex flex-wrap justify-center gap-4 print:hidden">
                <Link 
                  to="/"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold hover:scale-105 transition-transform shadow-lg shadow-primary/30"
                >
                  <Sparkles className="w-5 h-5" />
                  Explore Demos
                </Link>
                <a 
                  href="#features"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-card/50 backdrop-blur border border-border/50 font-bold hover:border-primary/50 transition-all"
                >
                  View All Features
                </a>
                <Button
                  onClick={handleExportPDF}
                  className="inline-flex items-center gap-2 px-8 py-4 h-auto rounded-xl bg-neon-green/20 border border-neon-green/50 text-neon-green font-bold hover:bg-neon-green/30 hover:scale-105 transition-all"
                >
                  <Download className="w-5 h-5" />
                  Export as PDF
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Project Overview */}
        <section className="py-16 border-t border-border/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <Brain className="w-8 h-8 text-primary" />
                Project Overview
              </h2>
              
              <div className="prose prose-invert max-w-none space-y-6">
                <div className="p-6 rounded-2xl bg-card/30 backdrop-blur border border-border/30">
                  <h3 className="text-xl font-bold mb-4 text-primary">What is VisionHub?</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    VisionHub is an innovative computer vision demonstration platform that brings the power of AI and machine learning 
                    directly to your web browser. Built entirely with client-side technologies, it showcases seven distinct computer 
                    vision capabilities—from face detection and emotion recognition to background removal and smart attendance systems.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-2xl bg-card/30 backdrop-blur border border-border/30">
                    <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-neon-green" />
                      Privacy-First Design
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      All processing happens locally in your browser using WebGL/WebGPU acceleration. 
                      No images or video data ever leave your device, ensuring complete privacy and security.
                    </p>
                  </div>
                  
                  <div className="p-6 rounded-2xl bg-card/30 backdrop-blur border border-border/30">
                    <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-neon-orange" />
                      Real-Time Performance
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Optimized neural network models run at 30+ FPS on modern devices. 
                      Advanced techniques like model quantization and GPU acceleration ensure smooth, responsive experiences.
                    </p>
                  </div>
                  
                  <div className="p-6 rounded-2xl bg-card/30 backdrop-blur border border-border/30">
                    <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                      <Cloud className="w-5 h-5 text-neon-cyan" />
                      Cloud Integration
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Optional cloud features include user authentication, data persistence, 
                      Google Sheets integration for attendance tracking, and AI-powered text enhancement.
                    </p>
                  </div>
                  
                  <div className="p-6 rounded-2xl bg-card/30 backdrop-blur border border-border/30">
                    <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-neon-purple" />
                      Educational Value
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Each feature includes a "Learn How It Works" section explaining the underlying 
                      AI models, neural network architectures, and key computer vision concepts.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 border-t border-border/30">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
                <Layers className="w-8 h-8 text-primary" />
                Feature Documentation
              </h2>
              <p className="text-muted-foreground mb-10 max-w-2xl">
                Explore all seven computer vision features with detailed capabilities, use cases, and technology breakdowns.
              </p>
              
              <div className="space-y-6">
                {features.map((feature, index) => (
                  <FeatureDetail key={index} {...feature} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="py-16 border-t border-border/30">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <Cpu className="w-8 h-8 text-primary" />
                Technology Stack
              </h2>
              
              <div className="grid md:grid-cols-5 gap-4">
                {techStackOverview.map((category, i) => (
                  <div key={i} className="p-5 rounded-2xl bg-card/30 backdrop-blur border border-border/30">
                    <h3 className="font-bold mb-3 text-sm text-primary">{category.category}</h3>
                    <ul className="space-y-2">
                      {category.items.map((item, j) => (
                        <li key={j} className="text-sm text-muted-foreground flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-neon-green" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Architecture */}
        <section className="py-16 border-t border-border/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <Database className="w-8 h-8 text-primary" />
                System Architecture
              </h2>
              
              <div className="p-8 rounded-2xl bg-card/30 backdrop-blur border border-border/30">
                <div className="grid gap-4">
                  {/* Architecture Layers */}
                  {[
                    { name: "Presentation Layer", desc: "React Components, Tailwind CSS, Animations", color: "bg-neon-cyan/20 border-neon-cyan/40" },
                    { name: "Application Layer", desc: "React Router, State Management, Custom Hooks", color: "bg-neon-purple/20 border-neon-purple/40" },
                    { name: "Computer Vision Layer", desc: "TensorFlow.js, MediaPipe, face-api.js, Tesseract.js", color: "bg-neon-pink/20 border-neon-pink/40" },
                    { name: "AI Enhancement Layer", desc: "Transformers.js, Gemini AI, Edge Functions", color: "bg-neon-green/20 border-neon-green/40" },
                    { name: "Data Layer", desc: "Supabase, PostgreSQL, Storage Buckets, RLS Policies", color: "bg-neon-orange/20 border-neon-orange/40" },
                    { name: "Integration Layer", desc: "Google Sheets API, Web Speech API, WebRTC", color: "bg-primary/20 border-primary/40" }
                  ].map((layer, i) => (
                    <div key={i} className={cn(
                      "p-4 rounded-xl border text-center transition-all hover:scale-[1.02]",
                      layer.color
                    )}>
                      <p className="font-bold">{layer.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{layer.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="py-16 border-t border-border/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <Shield className="w-8 h-8 text-primary" />
                Security & Privacy
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-card/30 backdrop-blur border border-border/30 space-y-4">
                  <h3 className="font-bold text-lg text-neon-green flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Camera Data Protection
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-neon-green mt-0.5 flex-shrink-0" />
                      All video processing occurs locally in the browser
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-neon-green mt-0.5 flex-shrink-0" />
                      No frames are transmitted to external servers
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-neon-green mt-0.5 flex-shrink-0" />
                      Camera permissions can be revoked at any time
                    </li>
                  </ul>
                </div>
                
                <div className="p-6 rounded-2xl bg-card/30 backdrop-blur border border-border/30 space-y-4">
                  <h3 className="font-bold text-lg text-neon-cyan flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Data Security
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-neon-cyan mt-0.5 flex-shrink-0" />
                      Row Level Security (RLS) on all database tables
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-neon-cyan mt-0.5 flex-shrink-0" />
                      User-scoped data isolation
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-neon-cyan mt-0.5 flex-shrink-0" />
                      Signed URLs for private asset access
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Team & Credits */}
        <section className="py-16 border-t border-border/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-8 flex items-center justify-center gap-3">
                <Users className="w-8 h-8 text-primary" />
                Team & Credits
              </h2>
              
              <div className="inline-flex items-center gap-4 px-8 py-6 rounded-2xl bg-card/30 backdrop-blur border border-border/30">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-neon-orange to-neon-pink flex items-center justify-center">
                  <Flame className="w-8 h-8 text-primary-foreground" />
                </div>
                <div className="text-left">
                  <h3 className="text-2xl font-black text-gradient-animate">Team FireFlies</h3>
                  <p className="text-muted-foreground">Tech Expo 2026 Project Team</p>
                </div>
              </div>

              <div className="mt-12 p-6 rounded-2xl bg-muted/20 border border-border/30">
                <h4 className="font-bold mb-4">Built With</h4>
                <div className="flex flex-wrap justify-center gap-3">
                  {["React", "TypeScript", "Tailwind CSS", "TensorFlow.js", "MediaPipe", "Supabase", "Vite"].map((tech) => (
                    <span key={tech} className="px-4 py-2 rounded-full bg-background/50 border border-border/50 text-sm font-medium">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="py-20 border-t border-border/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-2xl mx-auto text-center">
              <Sparkles className="w-12 h-12 text-primary mx-auto mb-6 animate-pulse" />
              <h2 className="text-3xl font-bold mb-4">Ready to Explore?</h2>
              <p className="text-muted-foreground mb-8">
                Experience the future of computer vision directly in your browser.
              </p>
              <Link 
                to="/"
                className="inline-flex items-center gap-2 px-10 py-5 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold text-lg hover:scale-105 transition-transform shadow-lg shadow-primary/30"
              >
                Launch VisionHub
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
