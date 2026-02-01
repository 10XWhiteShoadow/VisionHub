import { useState, useRef, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { WebcamView, WebcamViewRef } from "@/components/WebcamView";
import { StatsDisplay } from "@/components/StatsDisplay";
import { LoadingState } from "@/components/LoadingState";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModelLearnContent } from "@/components/ModelLearnContent";
import { FlappyBirdGame } from "@/components/FlappyBirdGame";
import { Scan, Play, Pause, RefreshCw, GraduationCap, Video, Gamepad2 } from "lucide-react";
import * as faceapi from "@vladmandic/face-api";

// Emotion labels
const EMOTIONS = ["Happy", "Sad", "Angry", "Fearful", "Disgusted", "Surprised", "Neutral"] as const;
type Emotion = typeof EMOTIONS[number];

/**
 * Face Detection & Emotion Recognition page
 * Uses face-api.js for accurate expression-based emotion detection
 */
export default function FaceDetection() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Loading models...");
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faceCount, setFaceCount] = useState(0);
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>("Neutral");
  const [fps, setFps] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [faceYPosition, setFaceYPosition] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("demo");
  
  const webcamRef = useRef<WebcamViewRef>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const modelsLoadedRef = useRef(false);
  
  // Stabilization refs
  const emotionHistoryRef = useRef<Emotion[]>([]);
  const lastEmotionUpdateRef = useRef<number>(0);
  const faceCountHistoryRef = useRef<number[]>([]);
  const lastFacePositionRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
        
        setLoadingMessage("Loading face detection model...");
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        
        setLoadingMessage("Loading face landmark model...");
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        
        setLoadingMessage("Loading expression model...");
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
        
        modelsLoadedRef.current = true;
        setIsLoading(false);
        setIsRunning(true);
      } catch (err) {
        console.error("Failed to load face-api models:", err);
        setError("Failed to load face detection models. Please refresh and try again.");
        setIsLoading(false);
      }
    };

    loadModels();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Convert face-api expression to our emotion type
  const getTopEmotion = useCallback((expressions: faceapi.FaceExpressions): { emotion: Emotion; confidence: number } => {
    const emotionMap: Record<string, Emotion> = {
      happy: "Happy",
      sad: "Sad",
      angry: "Angry",
      fearful: "Fearful",
      disgusted: "Disgusted",
      surprised: "Surprised",
      neutral: "Neutral"
    };

    let topEmotion: Emotion = "Neutral";
    let topScore = 0;

    Object.entries(expressions).forEach(([emotion, score]) => {
      if (score > topScore && emotionMap[emotion]) {
        topScore = score;
        topEmotion = emotionMap[emotion];
      }
    });

    return { emotion: topEmotion, confidence: topScore };
  }, []);

  // Get stabilized emotion (update every 500ms or when confident change)
  const getStabilizedEmotion = useCallback((newEmotion: Emotion, emotionConfidence: number): Emotion => {
    const now = performance.now();
    const history = emotionHistoryRef.current;
    
    // Add to history (keep last 20 frames)
    history.push(newEmotion);
    if (history.length > 15) history.shift();
    
    // Only update displayed emotion every 500ms for stability
    if (now - lastEmotionUpdateRef.current < 500) {
      return currentEmotion;
    }
    
    // Find most common emotion in recent history
    const emotionCounts = history.reduce((acc, e) => {
      acc[e] = (acc[e] || 0) + 1;
      return acc;
    }, {} as Record<Emotion, number>);
    
    const dominantEmotion = Object.entries(emotionCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] as Emotion || "Neutral";
    
    // Update if dominant emotion appears in >40% of frames or high confidence
    const dominantCount = emotionCounts[dominantEmotion] || 0;
    if (dominantCount / history.length > 0.4 || emotionConfidence > 0.7) {
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

  // Process frame for face detection with expressions
  const processFrame = useCallback(async () => {
    const video = webcamRef.current?.getVideo();
    const canvas = canvasRef.current;

    if (!video || !canvas || !modelsLoadedRef.current || !isRunning) {
      if (isRunning) {
        animationRef.current = requestAnimationFrame(processFrame);
      }
      return;
    }

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
      
      // Detect faces with expressions
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceExpressions();
      
      // Calculate FPS
      frameCountRef.current++;
      const elapsed = startTime - lastTimeRef.current;
      if (elapsed >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / elapsed));
        frameCountRef.current = 0;
        lastTimeRef.current = startTime;
      }

      // Update stabilized face count
      const stableFaceCount = getStabilizedFaceCount(detections.length);
      setFaceCount(stableFaceCount);

      detections.forEach((detection, index) => {
        const box = detection.detection.box;
        const expressions = detection.expressions;
        
        // Get top emotion from expressions
        const { emotion: rawEmotion, confidence: emotionConfidence } = getTopEmotion(expressions);
        const stableEmotion = getStabilizedEmotion(rawEmotion, emotionConfidence);
        
        if (index === 0) {
          setCurrentEmotion(stableEmotion);
          setConfidence(Math.round(emotionConfidence * 100));
          
          // Calculate normalized face Y position for game (0 = top, 1 = bottom)
          const videoHeight = video.videoHeight || 480;
          const faceCenterY = box.y + box.height / 2;
          const normalizedY = Math.max(0, Math.min(1, faceCenterY / videoHeight));
          setFaceYPosition(normalizedY);
        }

        // Smooth box position to reduce jitter
        let smoothX = box.x;
        let smoothY = box.y;
        
        if (lastFacePositionRef.current && index === 0) {
          const smoothFactor = 0.3;
          smoothX = lastFacePositionRef.current.x + (box.x - lastFacePositionRef.current.x) * smoothFactor;
          smoothY = lastFacePositionRef.current.y + (box.y - lastFacePositionRef.current.y) * smoothFactor;
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

        // Draw face landmark points
        const landmarks = detection.landmarks;
        if (landmarks) {
          const positions = landmarks.positions;
          
          // Draw all 68 landmark points
          ctx.fillStyle = "hsl(330, 90%, 60%)"; // neon pink
          positions.forEach((point, pointIndex) => {
            // Calculate smoothed position relative to face box
            const pointX = smoothX + (point.x - box.x);
            const pointY = smoothY + (point.y - box.y);
            
            ctx.beginPath();
            ctx.arc(pointX, pointY, 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Highlight key features with larger dots
            // Eyes: 36-41 (left), 42-47 (right)
            // Nose: 27-35
            // Mouth: 48-67
            if ([36, 39, 42, 45, 30, 48, 54].includes(pointIndex)) {
              ctx.fillStyle = "hsl(187, 100%, 50%)"; // cyan for key points
              ctx.beginPath();
              ctx.arc(pointX, pointY, 4, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = "hsl(330, 90%, 60%)";
            }
          });
          
          // Draw connections for facial features (optional enhancement)
          ctx.strokeStyle = "rgba(0, 255, 255, 0.3)";
          ctx.lineWidth = 1;
          
          // Jaw line (0-16)
          ctx.beginPath();
          for (let i = 0; i <= 16; i++) {
            const pt = positions[i];
            const px = smoothX + (pt.x - box.x);
            const py = smoothY + (pt.y - box.y);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
          
          // Left eyebrow (17-21)
          ctx.beginPath();
          for (let i = 17; i <= 21; i++) {
            const pt = positions[i];
            const px = smoothX + (pt.x - box.x);
            const py = smoothY + (pt.y - box.y);
            if (i === 17) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
          
          // Right eyebrow (22-26)
          ctx.beginPath();
          for (let i = 22; i <= 26; i++) {
            const pt = positions[i];
            const px = smoothX + (pt.x - box.x);
            const py = smoothY + (pt.y - box.y);
            if (i === 22) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }

        // Get emotion emoji
        const emotionEmojis: Record<Emotion, string> = {
          Happy: "😊",
          Sad: "😢",
          Angry: "😠",
          Fearful: "😨",
          Disgusted: "🤢",
          Surprised: "😲",
          Neutral: "😐"
        };

        // Draw label background
        const label = `${emotionEmojis[stableEmotion]} ${stableEmotion} • ${Math.round(emotionConfidence * 100)}%`;
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
  }, [isRunning, getTopEmotion, getStabilizedEmotion, getStabilizedFaceCount]);

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

  // Get emotion emoji for stats
  const emotionEmojis: Record<Emotion, string> = {
    Happy: "😊",
    Sad: "😢",
    Angry: "😠",
    Fearful: "😨",
    Disgusted: "🤢",
    Surprised: "😲",
    Neutral: "😐"
  };

  const stats = [
    { label: "Faces", value: faceCount, color: "cyan" as const },
    { label: "Emotion", value: `${emotionEmojis[currentEmotion]} ${currentEmotion}`, color: "purple" as const },
    { label: "Confidence", value: `${confidence}%`, color: "green" as const },
    { label: "FPS", value: fps, color: "orange" as const },
  ];

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <LoadingState
            message="Loading Face Detection Models"
            subMessage={loadingMessage}
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
              Real-time face detection with expression-based emotion recognition
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

        {/* Tabs for Demo, Game and Learn */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="demo" className="gap-2">
              <Video className="w-4 h-4" />
              Live Demo
            </TabsTrigger>
            <TabsTrigger value="game" className="gap-2">
              <Gamepad2 className="w-4 h-4" />
              Flappy Face
            </TabsTrigger>
            <TabsTrigger value="learn" className="gap-2">
              <GraduationCap className="w-4 h-4" />
              Learn
            </TabsTrigger>
          </TabsList>

          <TabsContent value="demo" className="space-y-6">
            {/* Stats */}
            <StatsDisplay stats={stats} />

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
                <h3 className="text-lg font-semibold mb-4">Quick Guide</h3>
                <div className="space-y-4 text-sm text-muted-foreground">
                  <p>
                    This demo uses <span className="text-primary font-medium">face-api.js</span> with 
                    deep learning models for accurate expression recognition.
                  </p>
                  <div className="pt-4 border-t border-border">
                    <h4 className="text-foreground font-medium mb-2">Detected Emotions:</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <span>😊 Happy</span>
                      <span>😢 Sad</span>
                      <span>😠 Angry</span>
                      <span>😨 Fearful</span>
                      <span>🤢 Disgusted</span>
                      <span>😲 Surprised</span>
                      <span>😐 Neutral</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-border">
                    <h4 className="text-foreground font-medium mb-2">Features:</h4>
                    <ul className="space-y-1">
                      <li>• Expression-based detection</li>
                      <li>• Multi-face support</li>
                      <li>• Real-time processing</li>
                      <li>• Stabilized output</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="game" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Webcam for face tracking */}
              <div className="glass-card rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-neon-cyan/20 flex items-center justify-center">
                    <Scan className="w-4 h-4 text-neon-cyan" />
                  </div>
                  <h3 className="font-semibold">Face Tracking</h3>
                  {faceCount > 0 && (
                    <span className="ml-auto text-xs px-2 py-1 rounded-full bg-neon-green/20 text-neon-green">
                      ● Tracking
                    </span>
                  )}
                </div>
                <WebcamView
                  ref={webcamRef}
                  isProcessing={isRunning}
                  error={error}
                  className="aspect-[4/3]"
                >
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ transform: "scaleX(-1)" }}
                  />
                </WebcamView>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Move your face UP/DOWN to control the bird
                </p>
              </div>

              {/* Flappy Bird Game */}
              <div className="glass-card rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-neon-pink/20 flex items-center justify-center">
                    <Gamepad2 className="w-4 h-4 text-neon-pink" />
                  </div>
                  <h3 className="font-semibold">Flappy Face Game</h3>
                </div>
                <FlappyBirdGame 
                  faceY={faceYPosition} 
                  isTracking={faceCount > 0 && isRunning} 
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="learn">
            <div className="glass-card rounded-2xl p-6">
              <ModelLearnContent type="face" />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
