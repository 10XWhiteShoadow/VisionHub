import { useState, useRef, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { WebcamView, WebcamViewRef } from "@/components/WebcamView";
import { StatsDisplay } from "@/components/StatsDisplay";
import { LoadingState } from "@/components/LoadingState";
import { Button } from "@/components/ui/button";
import { Package, Play, Pause, RefreshCw, Target, CheckCircle } from "lucide-react";
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";

interface Detection {
  bbox: [number, number, number, number];
  class: string;
  score: number;
}

// Scavenger hunt items (common COCO-SSD classes)
const scavengerItems = [
  { name: "person", emoji: "👤" },
  { name: "cell phone", emoji: "📱" },
  { name: "bottle", emoji: "🍼" },
  { name: "cup", emoji: "☕" },
  { name: "book", emoji: "📖" },
  { name: "keyboard", emoji: "⌨️" },
  { name: "mouse", emoji: "🖱️" },
  { name: "laptop", emoji: "💻" },
];

/**
 * Object Detection page with scavenger hunt
 * Uses TensorFlow.js COCO-SSD to detect and count objects
 */
export default function ObjectDetection() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [objectCount, setObjectCount] = useState(0);
  const [detectedClasses, setDetectedClasses] = useState<string[]>([]);
  const [fps, setFps] = useState(0);
  
  // Scavenger hunt state
  const [huntActive, setHuntActive] = useState(false);
  const [foundItems, setFoundItems] = useState<Set<string>>(new Set());
  const [huntItems, setHuntItems] = useState<typeof scavengerItems>([]);
  
  const webcamRef = useRef<WebcamViewRef>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);

  // Initialize COCO-SSD model
  useEffect(() => {
    const initModel = async () => {
      try {
        await tf.ready();
        modelRef.current = await cocoSsd.load({
          base: "lite_mobilenet_v2",
        });
        
        setIsLoading(false);
        setIsRunning(true);
      } catch (err) {
        console.error("Failed to initialize COCO-SSD:", err);
        setError("Failed to load object detection model. Please refresh and try again.");
        setIsLoading(false);
      }
    };

    initModel();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Process frame for object detection
  const processFrame = useCallback(async () => {
    const video = webcamRef.current?.getVideo();
    const canvas = canvasRef.current;
    const model = modelRef.current;

    if (!video || !canvas || !model || !isRunning) return;

    if (video.readyState !== 4) {
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
      const startTime = performance.now();
      const predictions = await model.detect(video);
      
      // Calculate FPS
      frameCountRef.current++;
      const elapsed = startTime - lastTimeRef.current;
      if (elapsed >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / elapsed));
        frameCountRef.current = 0;
        lastTimeRef.current = startTime;
      }

      setObjectCount(predictions.length);
      
      const classes = predictions.map(p => p.class);
      setDetectedClasses(classes);

      // Update scavenger hunt
      if (huntActive) {
        classes.forEach(cls => {
          if (huntItems.some(item => item.name === cls)) {
            setFoundItems(prev => new Set([...prev, cls]));
          }
        });
      }

      // Color palette for different objects
      const colors: Record<string, string> = {
        person: "hsl(330, 90%, 60%)",
        bottle: "hsl(187, 100%, 50%)",
        cup: "hsl(142, 76%, 45%)",
        book: "hsl(25, 95%, 53%)",
        laptop: "hsl(262, 83%, 58%)",
        default: "hsl(187, 100%, 50%)",
      };

      // Draw predictions
      predictions.forEach((prediction, index) => {
        const [x, y, width, height] = prediction.bbox;
        const color = colors[prediction.class] || colors.default;
        
        // Bounding box
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.strokeRect(x, y, width, height);
        ctx.shadowBlur = 0;

        // Label background
        const label = `${prediction.class} ${Math.round(prediction.score * 100)}%`;
        ctx.font = "bold 14px 'JetBrains Mono'";
        const textWidth = ctx.measureText(label).width;
        
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.fillRect(x, y - 28, textWidth + 16, 24);
        
        // Label text
        ctx.fillStyle = color;
        ctx.fillText(label, x + 8, y - 10);

        // Count badge for duplicate objects
        const count = predictions.filter(p => p.class === prediction.class).length;
        if (count > 1 && predictions.findIndex(p => p.class === prediction.class) === index) {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x + width - 15, y + 15, 15, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillStyle = "black";
          ctx.font = "bold 12px 'JetBrains Mono'";
          ctx.textAlign = "center";
          ctx.fillText(count.toString(), x + width - 15, y + 20);
          ctx.textAlign = "left";
        }
      });
    } catch (err) {
      console.error("Object detection error:", err);
    }

    animationRef.current = requestAnimationFrame(processFrame);
  }, [isRunning, huntActive, huntItems]);

  useEffect(() => {
    if (isRunning && !isLoading) {
      processFrame();
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, isLoading, processFrame]);

  const toggleRunning = () => setIsRunning(!isRunning);
  
  const startHunt = () => {
    const shuffled = [...scavengerItems].sort(() => Math.random() - 0.5);
    setHuntItems(shuffled.slice(0, 4));
    setFoundItems(new Set());
    setHuntActive(true);
  };

  const stats = [
    { label: "Objects", value: objectCount, color: "pink" as const },
    { label: "Classes", value: [...new Set(detectedClasses)].length, color: "cyan" as const },
    { label: "FPS", value: fps, color: "green" as const },
  ];

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <LoadingState
            message="Loading Object Detection Model"
            subMessage="Initializing TensorFlow.js COCO-SSD..."
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-neon-pink/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-neon-pink" />
              </div>
              <h1 className="text-3xl font-bold">Object Detection & Counting</h1>
            </div>
            <p className="text-muted-foreground">
              Identify and count objects using COCO-SSD with scavenger hunt
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant={isRunning ? "neon-pink" : "default"}
              onClick={toggleRunning}
              className="gap-2"
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isRunning ? "Pause" : "Start"}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <StatsDisplay stats={stats} className="mb-6" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Webcam view */}
          <div className="lg:col-span-2">
            <div className="glass-card rounded-2xl p-4">
              <WebcamView
                ref={webcamRef}
                isProcessing={isRunning}
                error={error}
                mirrored={false}
              >
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </WebcamView>
            </div>
          </div>

          {/* Scavenger hunt panel */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-neon-green" />
              <h3 className="text-lg font-semibold">Scavenger Hunt</h3>
            </div>
            
            {!huntActive ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-6">
                  Find all the items in your surroundings!
                </p>
                <Button variant="gradient" onClick={startHunt} className="gap-2">
                  <Play className="w-4 h-4" />
                  Start Hunt
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Found: {foundItems.size}/{huntItems.length}
                </p>
                <div className="space-y-2">
                  {huntItems.map((item) => (
                    <div
                      key={item.name}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                        foundItems.has(item.name)
                          ? "bg-neon-green/20 border border-neon-green/30"
                          : "bg-muted/30"
                      }`}
                    >
                      <span className="text-2xl">{item.emoji}</span>
                      <span className={foundItems.has(item.name) ? "text-neon-green" : ""}>
                        {item.name}
                      </span>
                      {foundItems.has(item.name) && (
                        <CheckCircle className="w-5 h-5 text-neon-green ml-auto" />
                      )}
                    </div>
                  ))}
                </div>
                
                {foundItems.size === huntItems.length && (
                  <div className="text-center p-4 bg-neon-green/20 rounded-xl border border-neon-green/30">
                    <p className="text-xl font-bold text-neon-green">🎉 You found everything!</p>
                    <Button variant="outline" onClick={startHunt} className="mt-4">
                      Play Again
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-6 pt-4 border-t border-border">
              <h4 className="text-sm font-medium mb-2">Detectable Objects:</h4>
              <p className="text-xs text-muted-foreground">
                person, bicycle, car, motorcycle, airplane, bus, train, truck, boat, traffic light, 
                fire hydrant, stop sign, parking meter, bench, bird, cat, dog, horse, sheep, cow, 
                elephant, bear, zebra, giraffe, backpack, umbrella, handbag, tie, suitcase, frisbee...
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
