import { useState, useRef, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { WebcamView, WebcamViewRef } from "@/components/WebcamView";
import { StatsDisplay } from "@/components/StatsDisplay";
import { LoadingState } from "@/components/LoadingState";
import { Button } from "@/components/ui/button";
import { Activity, Play, Pause, RefreshCw, Dumbbell } from "lucide-react";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

// Pose landmark indices
const POSE = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
};

// Calculate angle between three points
const calculateAngle = (a: any, b: any, c: any): number => {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
};

/**
 * Pose Estimation page with exercise counter
 * Uses MediaPipe Pose Landmarker for body tracking and rep counting
 */
export default function PoseEstimation() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  
  // Exercise state
  const [exercise, setExercise] = useState<"squats" | "pushups" | "none">("none");
  const [repCount, setRepCount] = useState(0);
  const [isDown, setIsDown] = useState(false);
  const [currentAngle, setCurrentAngle] = useState(0);
  
  const webcamRef = useRef<WebcamViewRef>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);

  // Initialize MediaPipe Pose Landmarker
  useEffect(() => {
    const initPoseLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        
        poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
        });
        
        setIsLoading(false);
        setIsRunning(true);
      } catch (err) {
        console.error("Failed to initialize pose landmarker:", err);
        setError("Failed to load pose estimation model. Please refresh and try again.");
        setIsLoading(false);
      }
    };

    initPoseLandmarker();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Process frame for pose detection
  const processFrame = useCallback(() => {
    const video = webcamRef.current?.getVideo();
    const canvas = canvasRef.current;
    const landmarker = poseLandmarkerRef.current;

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

      if (results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        
        // Exercise detection and counting
        if (exercise === "squats") {
          const hip = landmarks[POSE.LEFT_HIP];
          const knee = landmarks[POSE.LEFT_KNEE];
          const ankle = landmarks[POSE.LEFT_ANKLE];
          const angle = calculateAngle(hip, knee, ankle);
          setCurrentAngle(Math.round(angle));
          
          if (angle < 90 && !isDown) {
            setIsDown(true);
          } else if (angle > 160 && isDown) {
            setIsDown(false);
            setRepCount(prev => prev + 1);
          }
        } else if (exercise === "pushups") {
          const shoulder = landmarks[POSE.LEFT_SHOULDER];
          const elbow = landmarks[POSE.LEFT_ELBOW];
          const wrist = landmarks[POSE.LEFT_WRIST];
          const angle = calculateAngle(shoulder, elbow, wrist);
          setCurrentAngle(Math.round(angle));
          
          if (angle < 90 && !isDown) {
            setIsDown(true);
          } else if (angle > 160 && isDown) {
            setIsDown(false);
            setRepCount(prev => prev + 1);
          }
        }

        // Pose connections for skeleton
        const connections = [
          [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // Upper body
          [11, 23], [12, 24], [23, 24], // Torso
          [23, 25], [25, 27], [24, 26], [26, 28], // Legs
        ];

        // Draw connections
        ctx.strokeStyle = "hsl(142, 76%, 45%)";
        ctx.lineWidth = 4;
        ctx.shadowColor = "hsl(142, 76%, 45%)";
        ctx.shadowBlur = 15;

        connections.forEach(([i, j]) => {
          const start = landmarks[i];
          const end = landmarks[j];
          ctx.beginPath();
          ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
          ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
          ctx.stroke();
        });

        ctx.shadowBlur = 0;

        // Draw landmarks
        landmarks.forEach((landmark, index) => {
          const x = landmark.x * canvas.width;
          const y = landmark.y * canvas.height;
          
          // Highlight tracked joints
          const isTrackedJoint = Object.values(POSE).includes(index);
          
          ctx.beginPath();
          ctx.arc(x, y, isTrackedJoint ? 8 : 4, 0, 2 * Math.PI);
          ctx.fillStyle = isTrackedJoint ? "hsl(187, 100%, 50%)" : "hsl(142, 76%, 45%)";
          ctx.fill();
          
          if (isTrackedJoint) {
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, 2 * Math.PI);
            ctx.strokeStyle = "hsl(187, 100%, 50%)";
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        });

        // Draw angle indicator for active exercise
        if (exercise !== "none") {
          ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
          ctx.fillRect(20, 20, 120, 40);
          ctx.fillStyle = "hsl(142, 76%, 45%)";
          ctx.font = "bold 20px 'JetBrains Mono'";
          ctx.fillText(`${currentAngle}°`, 30, 50);
        }
      }
    } catch (err) {
      console.error("Pose detection error:", err);
    }

    animationRef.current = requestAnimationFrame(processFrame);
  }, [isRunning, exercise, isDown, currentAngle]);

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
  
  const selectExercise = (ex: "squats" | "pushups") => {
    setExercise(ex);
    setRepCount(0);
    setIsDown(false);
  };

  const resetCounter = () => {
    setRepCount(0);
    setIsDown(false);
  };

  const stats = [
    { label: "Exercise", value: exercise === "none" ? "None" : exercise.charAt(0).toUpperCase() + exercise.slice(1), color: "green" as const },
    { label: "Reps", value: repCount, color: "cyan" as const },
    { label: "FPS", value: fps, color: "orange" as const },
  ];

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <LoadingState
            message="Loading Pose Estimation Model"
            subMessage="Initializing MediaPipe Pose Landmarker..."
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
              <div className="w-10 h-10 rounded-xl bg-neon-green/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-neon-green" />
              </div>
              <h1 className="text-3xl font-bold">Pose Estimation & Exercise</h1>
            </div>
            <p className="text-muted-foreground">
              Track your body pose and count exercise repetitions
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant={isRunning ? "neon-green" : "default"}
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

          {/* Exercise panel */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Dumbbell className="w-5 h-5 text-neon-orange" />
              <h3 className="text-lg font-semibold">Exercise Counter</h3>
            </div>
            
            {/* Rep counter display */}
            <div className="text-center p-6 bg-card rounded-xl mb-6">
              <p className="text-muted-foreground text-sm mb-2">Repetitions</p>
              <p className="text-7xl font-bold font-mono text-neon-green">{repCount}</p>
              {exercise !== "none" && (
                <p className="text-sm text-muted-foreground mt-2">
                  {isDown ? "Down position ⬇️" : "Up position ⬆️"}
                </p>
              )}
            </div>

            {/* Exercise selection */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Select Exercise:</p>
              <Button
                variant={exercise === "squats" ? "gradient" : "outline"}
                className="w-full justify-start gap-3"
                onClick={() => selectExercise("squats")}
              >
                <span className="text-2xl">🦵</span>
                <span>Squats</span>
              </Button>
              <Button
                variant={exercise === "pushups" ? "gradient" : "outline"}
                className="w-full justify-start gap-3"
                onClick={() => selectExercise("pushups")}
              >
                <span className="text-2xl">💪</span>
                <span>Push-ups</span>
              </Button>
            </div>

            {exercise !== "none" && (
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={resetCounter}
              >
                Reset Counter
              </Button>
            )}

            <div className="mt-6 pt-4 border-t border-border">
              <h4 className="text-sm font-medium mb-2">Tips:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Stand sideways to camera for best results</li>
                <li>• Ensure full body is visible</li>
                <li>• Move at a steady pace</li>
                <li>• Good lighting improves accuracy</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
