import { useState, useRef, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { WebcamView, WebcamViewRef } from "@/components/WebcamView";
import { StatsDisplay } from "@/components/StatsDisplay";
import { LoadingState } from "@/components/LoadingState";
import { Button } from "@/components/ui/button";
import { Hand, Play, Pause, RefreshCw, Trophy } from "lucide-react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

// Gesture recognition based on finger positions
const recognizeGesture = (landmarks: any[]): string => {
  if (!landmarks || landmarks.length === 0) return "No hand";
  
  const tips = [8, 12, 16, 20]; // Index, middle, ring, pinky tips
  const mcp = [5, 9, 13, 17]; // Base of each finger
  const thumb = landmarks[4];
  const thumbBase = landmarks[2];
  
  // Count extended fingers
  let extendedFingers = 0;
  tips.forEach((tip, i) => {
    if (landmarks[tip].y < landmarks[mcp[i]].y) {
      extendedFingers++;
    }
  });
  
  // Thumb check
  const thumbExtended = thumb.x < thumbBase.x;
  if (thumbExtended) extendedFingers++;
  
  if (extendedFingers === 0) return "Fist ✊";
  if (extendedFingers === 1 && landmarks[8].y < landmarks[6].y) return "Pointing ☝️";
  if (extendedFingers === 2) return "Peace ✌️";
  if (extendedFingers === 3) return "Three 🤟";
  if (extendedFingers === 4) return "Four 🖖";
  if (extendedFingers === 5) return "Open Hand ✋";
  
  return "Unknown";
};

// Game targets
const gameTargets = ["Fist ✊", "Peace ✌️", "Open Hand ✋", "Pointing ☝️"];

/**
 * Hand Gesture Recognition page with mini-game
 * Uses MediaPipe Hand Landmarker to track hands and recognize gestures
 */
export default function HandGesture() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handCount, setHandCount] = useState(0);
  const [currentGesture, setCurrentGesture] = useState("None");
  const [fps, setFps] = useState(0);
  
  // Game state
  const [gameActive, setGameActive] = useState(false);
  const [targetGesture, setTargetGesture] = useState("");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  
  const webcamRef = useRef<WebcamViewRef>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);

  // Initialize MediaPipe Hand Landmarker
  useEffect(() => {
    const initHandLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
        });
        
        setIsLoading(false);
        setIsRunning(true);
      } catch (err) {
        console.error("Failed to initialize hand landmarker:", err);
        setError("Failed to load hand tracking model. Please refresh and try again.");
        setIsLoading(false);
      }
    };

    initHandLandmarker();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Game timer
  useEffect(() => {
    if (gameActive && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      setGameActive(false);
    }
  }, [gameActive, timeLeft]);

  // Check for matching gesture
  useEffect(() => {
    if (gameActive && currentGesture === targetGesture) {
      setScore(s => s + 10);
      setTargetGesture(gameTargets[Math.floor(Math.random() * gameTargets.length)]);
    }
  }, [currentGesture, targetGesture, gameActive]);

  // Process frame for hand detection
  const processFrame = useCallback(() => {
    const video = webcamRef.current?.getVideo();
    const canvas = canvasRef.current;
    const landmarker = handLandmarkerRef.current;

    if (!video || !canvas || !landmarker || !isRunning) return;

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
      const results = landmarker.detectForVideo(video, startTime);
      
      // Calculate FPS
      frameCountRef.current++;
      const elapsed = startTime - lastTimeRef.current;
      if (elapsed >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / elapsed));
        frameCountRef.current = 0;
        lastTimeRef.current = startTime;
      }

      setHandCount(results.landmarks.length);

      // Draw hand landmarks
      results.landmarks.forEach((landmarks, handIndex) => {
        const gesture = recognizeGesture(landmarks);
        if (handIndex === 0) setCurrentGesture(gesture);

        // Draw connections
        const connections = [
          [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
          [0, 5], [5, 6], [6, 7], [7, 8], // Index
          [0, 9], [9, 10], [10, 11], [11, 12], // Middle
          [0, 13], [13, 14], [14, 15], [15, 16], // Ring
          [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
          [5, 9], [9, 13], [13, 17], // Palm
        ];

        ctx.strokeStyle = handIndex === 0 ? "hsl(262, 83%, 58%)" : "hsl(330, 90%, 60%)";
        ctx.lineWidth = 3;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 10;

        connections.forEach(([i, j]) => {
          const start = landmarks[i];
          const end = landmarks[j];
          ctx.beginPath();
          ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
          ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
          ctx.stroke();
        });

        ctx.shadowBlur = 0;

        // Draw landmark points
        landmarks.forEach((landmark, index) => {
          const x = landmark.x * canvas.width;
          const y = landmark.y * canvas.height;
          
          // Fingertips are brighter
          const isTip = [4, 8, 12, 16, 20].includes(index);
          
          ctx.beginPath();
          ctx.arc(x, y, isTip ? 8 : 4, 0, 2 * Math.PI);
          ctx.fillStyle = isTip ? "hsl(187, 100%, 50%)" : "hsl(262, 83%, 58%)";
          ctx.fill();
          
          if (isTip) {
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, 2 * Math.PI);
            ctx.strokeStyle = "hsl(187, 100%, 50%)";
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        });
      });
    } catch (err) {
      console.error("Hand detection error:", err);
    }

    animationRef.current = requestAnimationFrame(processFrame);
  }, [isRunning]);

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
  
  const startGame = () => {
    setGameActive(true);
    setScore(0);
    setTimeLeft(30);
    setTargetGesture(gameTargets[Math.floor(Math.random() * gameTargets.length)]);
  };

  const stats = [
    { label: "Hands", value: handCount, color: "purple" as const },
    { label: "Gesture", value: currentGesture, color: "cyan" as const },
    { label: "FPS", value: fps, color: "green" as const },
  ];

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <LoadingState
            message="Loading Hand Tracking Model"
            subMessage="Initializing MediaPipe Hand Landmarker..."
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
              <div className="w-10 h-10 rounded-xl bg-neon-purple/20 flex items-center justify-center">
                <Hand className="w-5 h-5 text-neon-purple" />
              </div>
              <h1 className="text-3xl font-bold">Hand Gesture Recognition</h1>
            </div>
            <p className="text-muted-foreground">
              Track hand movements and play the gesture matching game
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant={isRunning ? "neon-purple" : "default"}
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
              >
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
              </WebcamView>
            </div>
          </div>

          {/* Game panel */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-neon-orange" />
              <h3 className="text-lg font-semibold">Gesture Game</h3>
            </div>
            
            {!gameActive ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-6">
                  Match the target gesture as fast as you can!
                </p>
                <Button variant="gradient" onClick={startGame} className="gap-2">
                  <Play className="w-4 h-4" />
                  Start Game
                </Button>
                {score > 0 && (
                  <p className="mt-4 text-lg">Last Score: <span className="text-primary font-bold">{score}</span></p>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="mb-4">
                  <p className="text-muted-foreground text-sm">Time Left</p>
                  <p className="text-4xl font-bold font-mono text-neon-orange">{timeLeft}s</p>
                </div>
                <div className="mb-4">
                  <p className="text-muted-foreground text-sm">Show this gesture:</p>
                  <p className="text-3xl mt-2">{targetGesture}</p>
                </div>
                <div className="p-4 bg-card rounded-xl">
                  <p className="text-muted-foreground text-sm">Score</p>
                  <p className="text-5xl font-bold text-primary">{score}</p>
                </div>
              </div>
            )}
            
            <div className="mt-6 pt-4 border-t border-border">
              <h4 className="text-sm font-medium mb-2">Available Gestures:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <span>✊ Fist</span>
                <span>☝️ Pointing</span>
                <span>✌️ Peace</span>
                <span>✋ Open Hand</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
