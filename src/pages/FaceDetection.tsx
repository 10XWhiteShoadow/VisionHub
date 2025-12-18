import { useState, useRef, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { WebcamView, WebcamViewRef } from "@/components/WebcamView";
import { StatsDisplay } from "@/components/StatsDisplay";
import { LoadingState } from "@/components/LoadingState";
import { Button } from "@/components/ui/button";
import { Scan, Play, Pause, RefreshCw } from "lucide-react";
import { FilesetResolver, FaceDetector } from "@mediapipe/tasks-vision";

// Emotion labels
const EMOTIONS = ["Happy", "Neutral", "Surprised", "Calm", "Focused"] as const;
type Emotion = typeof EMOTIONS[number];

/**
 * Face Detection & Emotion Recognition page
 * Uses MediaPipe Face Detector with stabilized emotion estimation
 */
export default function FaceDetection() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faceCount, setFaceCount] = useState(0);
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>("Neutral");
  const [fps, setFps] = useState(0);
  const [confidence, setConfidence] = useState(0);
  
  const webcamRef = useRef<WebcamViewRef>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceDetectorRef = useRef<FaceDetector | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  
  // Stabilization refs
  const emotionHistoryRef = useRef<Emotion[]>([]);
  const lastEmotionUpdateRef = useRef<number>(0);
  const prevFaceMetricsRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const movementHistoryRef = useRef<number[]>([]);
  const faceCountHistoryRef = useRef<number[]>([]);
  const lastFacePositionRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize MediaPipe Face Detector
  useEffect(() => {
    const initFaceDetector = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        
        faceDetectorRef.current = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.7, // Higher threshold for stability
        });
        
        setIsLoading(false);
        setIsRunning(true);
      } catch (err) {
        console.error("Failed to initialize face detector:", err);
        setError("Failed to load face detection model. Please refresh and try again.");
        setIsLoading(false);
      }
    };

    initFaceDetector();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Estimate emotion based on face metrics and movement
  const estimateEmotion = useCallback((detection: any): Emotion => {
    const score = detection.categories?.[0]?.score || 0.5;
    const box = detection.boundingBox;
    
    if (!box) return "Neutral";
    
    const currentMetrics = { x: box.originX, y: box.originY, w: box.width, h: box.height };
    const prev = prevFaceMetricsRef.current;
    
    // Calculate movement/change
    let movement = 0;
    let sizeChange = 0;
    
    if (prev) {
      movement = Math.abs(currentMetrics.x - prev.x) + Math.abs(currentMetrics.y - prev.y);
      sizeChange = Math.abs(currentMetrics.w - prev.w) + Math.abs(currentMetrics.h - prev.h);
    }
    
    prevFaceMetricsRef.current = currentMetrics;
    
    // Track movement history
    movementHistoryRef.current.push(movement);
    if (movementHistoryRef.current.length > 30) movementHistoryRef.current.shift();
    
    const avgMovement = movementHistoryRef.current.reduce((a, b) => a + b, 0) / 
      Math.max(movementHistoryRef.current.length, 1);
    
    // Determine emotion based on movement primarily
    // High movement = Surprised
    if (avgMovement > 20) return "Surprised";
    
    // Moderate movement = Happy (animated/expressive)
    if (avgMovement > 10) return "Happy";
    
    // Size changes (leaning in/out) = Focused
    if (sizeChange > 15) return "Focused";
    
    // Very still with high confidence = Calm
    if (avgMovement < 2 && score > 0.9) return "Calm";
    
    // Slight movement = Focused (paying attention)
    if (avgMovement > 4) return "Focused";
    
    // Default = Neutral
    return "Neutral";
  }, []);

  // Get stabilized emotion (update every 1 second or when confident change)
  const getStabilizedEmotion = useCallback((newEmotion: Emotion): Emotion => {
    const now = performance.now();
    const history = emotionHistoryRef.current;
    
    // Add to history (keep last 20 frames)
    history.push(newEmotion);
    if (history.length > 20) history.shift();
    
    // Only update displayed emotion every 1 second
    if (now - lastEmotionUpdateRef.current < 1000) {
      return currentEmotion;
    }
    
    // Find most common emotion in recent history
    const emotionCounts = history.reduce((acc, e) => {
      acc[e] = (acc[e] || 0) + 1;
      return acc;
    }, {} as Record<Emotion, number>);
    
    const dominantEmotion = Object.entries(emotionCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] as Emotion || "Neutral";
    
    // Update if dominant emotion appears in >35% of frames
    const dominantCount = emotionCounts[dominantEmotion] || 0;
    if (dominantCount / history.length > 0.35) {
      lastEmotionUpdateRef.current = now;
      return dominantEmotion;
    }
    
    return currentEmotion;
  }, [currentEmotion]);

  // Get stabilized face count (smooth transitions)
  const getStabilizedFaceCount = useCallback((newCount: number): number => {
    const history = faceCountHistoryRef.current;
    
    history.push(newCount);
    if (history.length > 10) history.shift();
    
    // Use mode (most common) for stability
    const countMode = history.reduce((acc, c) => {
      acc[c] = (acc[c] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    return Number(Object.entries(countMode)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 0);
  }, []);

  // Process frame for face detection
  const processFrame = useCallback(() => {
    const video = webcamRef.current?.getVideo();
    const canvas = canvasRef.current;
    const detector = faceDetectorRef.current;

    if (!video || !canvas || !detector || !isRunning) return;

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
      const detections = detector.detectForVideo(video, startTime);
      
      // Calculate FPS
      frameCountRef.current++;
      const elapsed = startTime - lastTimeRef.current;
      if (elapsed >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / elapsed));
        frameCountRef.current = 0;
        lastTimeRef.current = startTime;
      }

      // Update stabilized face count
      const stableFaceCount = getStabilizedFaceCount(detections.detections.length);
      setFaceCount(stableFaceCount);

      detections.detections.forEach((detection, index) => {
        const box = detection.boundingBox;
        if (!box) return;

        const detectionConfidence = detection.categories?.[0]?.score || 0;
        if (index === 0) {
          setConfidence(Math.round(detectionConfidence * 100));
        }

        // Estimate and stabilize emotion
        const rawEmotion = estimateEmotion(detection);
        const stableEmotion = getStabilizedEmotion(rawEmotion);
        if (index === 0) setCurrentEmotion(stableEmotion);

        // Smooth box position to reduce jitter
        let smoothX = box.originX;
        let smoothY = box.originY;
        
        if (lastFacePositionRef.current && index === 0) {
          const smoothFactor = 0.3; // Lower = smoother
          smoothX = lastFacePositionRef.current.x + (box.originX - lastFacePositionRef.current.x) * smoothFactor;
          smoothY = lastFacePositionRef.current.y + (box.originY - lastFacePositionRef.current.y) * smoothFactor;
        }
        
        if (index === 0) {
          lastFacePositionRef.current = { x: smoothX, y: smoothY };
        }

        // Draw smooth bounding box with neon glow
        ctx.strokeStyle = "hsl(187, 100%, 50%)";
        ctx.lineWidth = 3;
        ctx.shadowColor = "hsl(187, 100%, 50%)";
        ctx.shadowBlur = 15;
        
        const radius = 10;
        ctx.beginPath();
        ctx.roundRect(smoothX, smoothY, box.width, box.height, radius);
        ctx.stroke();

        ctx.shadowBlur = 0;

        // Draw label background
        const label = `Face ${index + 1} • ${stableEmotion}`;
        ctx.font = "bold 14px 'JetBrains Mono'";
        const textWidth = ctx.measureText(label).width;
        
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(smoothX, smoothY - 28, textWidth + 16, 24);
        
        // Draw label text
        ctx.fillStyle = "hsl(187, 100%, 50%)";
        ctx.fillText(label, smoothX + 8, smoothY - 10);

        // Draw corner markers
        const markerSize = 15;
        ctx.strokeStyle = "hsl(262, 83%, 58%)";
        ctx.lineWidth = 2;
        
        // Top-left
        ctx.beginPath();
        ctx.moveTo(smoothX, smoothY + markerSize);
        ctx.lineTo(smoothX, smoothY);
        ctx.lineTo(smoothX + markerSize, smoothY);
        ctx.stroke();
        
        // Top-right
        ctx.beginPath();
        ctx.moveTo(smoothX + box.width - markerSize, smoothY);
        ctx.lineTo(smoothX + box.width, smoothY);
        ctx.lineTo(smoothX + box.width, smoothY + markerSize);
        ctx.stroke();
        
        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(smoothX, smoothY + box.height - markerSize);
        ctx.lineTo(smoothX, smoothY + box.height);
        ctx.lineTo(smoothX + markerSize, smoothY + box.height);
        ctx.stroke();
        
        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(smoothX + box.width - markerSize, smoothY + box.height);
        ctx.lineTo(smoothX + box.width, smoothY + box.height);
        ctx.lineTo(smoothX + box.width, smoothY + box.height - markerSize);
        ctx.stroke();
      });
    } catch (err) {
      console.error("Face detection error:", err);
    }

    animationRef.current = requestAnimationFrame(processFrame);
  }, [isRunning, estimateEmotion, getStabilizedEmotion, getStabilizedFaceCount]);

  // Start processing when running
  useEffect(() => {
    if (isRunning && !isLoading) {
      animationRef.current = requestAnimationFrame(processFrame);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, isLoading, processFrame]);

  const toggleRunning = () => setIsRunning(!isRunning);

  const stats = [
    { label: "Faces", value: faceCount, color: "cyan" as const },
    { label: "Emotion", value: currentEmotion, color: "purple" as const },
    { label: "Confidence", value: `${confidence}%`, color: "green" as const },
    { label: "FPS", value: fps, color: "orange" as const },
  ];

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <LoadingState
            message="Loading Face Detection Model"
            subMessage="Initializing MediaPipe Face Detector..."
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
              <div className="w-10 h-10 rounded-xl bg-neon-cyan/20 flex items-center justify-center">
                <Scan className="w-5 h-5 text-neon-cyan" />
              </div>
              <h1 className="text-3xl font-bold">Face Detection & Emotion</h1>
            </div>
            <p className="text-muted-foreground">
              Real-time face detection with stabilized emotion recognition
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant={isRunning ? "neon" : "default"}
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

        {/* Stats */}
        <StatsDisplay stats={stats} className="mb-6" />

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Webcam view */}
          <div className="lg:col-span-2">
            <div className="glass-card rounded-2xl p-4">
              <WebcamView
                ref={webcamRef}
                isProcessing={isRunning}
                error={error}
              >
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
              </WebcamView>
            </div>
          </div>

          {/* Info panel */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">How It Works</h3>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                This demo uses <span className="text-primary font-medium">MediaPipe Face Detector</span> with 
                stabilization algorithms for smooth detection.
              </p>
              <p>
                Emotion estimation uses face metrics and is <span className="text-neon-cyan font-medium">stabilized over time</span> to 
                prevent flickering and provide consistent results.
              </p>
              <div className="pt-4 border-t border-border">
                <h4 className="text-foreground font-medium mb-2">Features:</h4>
                <ul className="space-y-1">
                  <li>• Stabilized multi-face detection</li>
                  <li>• Smooth bounding box tracking</li>
                  <li>• Temporal emotion averaging</li>
                  <li>• GPU-accelerated processing</li>
                  <li>• Reduced jitter & flickering</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
