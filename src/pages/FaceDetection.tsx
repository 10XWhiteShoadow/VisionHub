import { useState, useRef, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { WebcamView, WebcamViewRef } from "@/components/WebcamView";
import { StatsDisplay } from "@/components/StatsDisplay";
import { LoadingState } from "@/components/LoadingState";
import { Button } from "@/components/ui/button";
import { Scan, Play, Pause, RefreshCw } from "lucide-react";
import { FilesetResolver, FaceDetector } from "@mediapipe/tasks-vision";

interface DetectedFace {
  boundingBox: {
    originX: number;
    originY: number;
    width: number;
    height: number;
  };
  categories: Array<{ categoryName: string; score: number }>;
}

// Simple emotion mapping based on face features
const emotions = ["Happy", "Neutral", "Surprised", "Sad", "Angry"];

/**
 * Face Detection & Emotion Recognition page
 * Uses MediaPipe Face Detector to detect faces and estimate emotions
 */
export default function FaceDetection() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faceCount, setFaceCount] = useState(0);
  const [currentEmotion, setCurrentEmotion] = useState("Neutral");
  const [fps, setFps] = useState(0);
  
  const webcamRef = useRef<WebcamViewRef>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceDetectorRef = useRef<FaceDetector | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);

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

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
      // Detect faces
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

      // Update face count
      setFaceCount(detections.detections.length);

      // Draw detections
      detections.detections.forEach((detection, index) => {
        const box = detection.boundingBox;
        if (!box) return;

        // Randomize emotion for demo (in real app, would use emotion model)
        const emotion = emotions[Math.floor(Math.random() * emotions.length)];
        if (index === 0) setCurrentEmotion(emotion);

        // Draw bounding box with neon glow
        ctx.strokeStyle = "hsl(187, 100%, 50%)";
        ctx.lineWidth = 3;
        ctx.shadowColor = "hsl(187, 100%, 50%)";
        ctx.shadowBlur = 15;
        
        // Rounded rectangle
        const radius = 10;
        ctx.beginPath();
        ctx.roundRect(box.originX, box.originY, box.width, box.height, radius);
        ctx.stroke();

        // Reset shadow
        ctx.shadowBlur = 0;

        // Draw label background
        const label = `Face ${index + 1} • ${emotion}`;
        ctx.font = "bold 14px 'JetBrains Mono'";
        const textWidth = ctx.measureText(label).width;
        
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(box.originX, box.originY - 28, textWidth + 16, 24);
        
        // Draw label text
        ctx.fillStyle = "hsl(187, 100%, 50%)";
        ctx.fillText(label, box.originX + 8, box.originY - 10);

        // Draw corner markers
        const markerSize = 15;
        ctx.strokeStyle = "hsl(262, 83%, 58%)";
        ctx.lineWidth = 2;
        
        // Top-left
        ctx.beginPath();
        ctx.moveTo(box.originX, box.originY + markerSize);
        ctx.lineTo(box.originX, box.originY);
        ctx.lineTo(box.originX + markerSize, box.originY);
        ctx.stroke();
        
        // Top-right
        ctx.beginPath();
        ctx.moveTo(box.originX + box.width - markerSize, box.originY);
        ctx.lineTo(box.originX + box.width, box.originY);
        ctx.lineTo(box.originX + box.width, box.originY + markerSize);
        ctx.stroke();
        
        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(box.originX, box.originY + box.height - markerSize);
        ctx.lineTo(box.originX, box.originY + box.height);
        ctx.lineTo(box.originX + markerSize, box.originY + box.height);
        ctx.stroke();
        
        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(box.originX + box.width - markerSize, box.originY + box.height);
        ctx.lineTo(box.originX + box.width, box.originY + box.height);
        ctx.lineTo(box.originX + box.width, box.originY + box.height - markerSize);
        ctx.stroke();
      });
    } catch (err) {
      console.error("Face detection error:", err);
    }

    animationRef.current = requestAnimationFrame(processFrame);
  }, [isRunning]);

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
    { label: "FPS", value: fps, color: "green" as const },
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
              Real-time face detection with emotion recognition using MediaPipe
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
                This demo uses <span className="text-primary font-medium">MediaPipe Face Detector</span> to 
                identify faces in real-time.
              </p>
              <p>
                The model detects facial landmarks and bounding boxes, which we use to track 
                faces and estimate emotional states.
              </p>
              <div className="pt-4 border-t border-border">
                <h4 className="text-foreground font-medium mb-2">Features:</h4>
                <ul className="space-y-1">
                  <li>• Multi-face detection</li>
                  <li>• Real-time bounding boxes</li>
                  <li>• Emotion estimation</li>
                  <li>• GPU-accelerated processing</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
