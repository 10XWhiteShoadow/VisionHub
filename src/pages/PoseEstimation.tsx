import { useState, useRef, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { WebcamView, WebcamViewRef } from "@/components/WebcamView";
import { StatsDisplay } from "@/components/StatsDisplay";
import { LoadingState } from "@/components/LoadingState";
import { Button } from "@/components/ui/button";
import { Activity, Play, Pause, RefreshCw, Dumbbell, RotateCcw } from "lucide-react";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

// Pose landmark indices
const POSE = {
  NOSE: 0,
  LEFT_EYE: 2,
  RIGHT_EYE: 5,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
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

// Exercise configurations
type ExerciseType = "squats" | "pushups" | "lunges" | "jumping_jacks" | "arm_raises" | "high_knees" | "none";

interface ExerciseConfig {
  name: string;
  emoji: string;
  description: string;
  checkDown: (landmarks: any[], angle: number) => boolean;
  checkUp: (landmarks: any[], angle: number) => boolean;
  getAngle: (landmarks: any[]) => number;
  tips: string[];
}

const exercises: Record<Exclude<ExerciseType, "none">, ExerciseConfig> = {
  squats: {
    name: "Squats",
    emoji: "🦵",
    description: "Bend knees to 90°, then stand up",
    checkDown: (_, angle) => angle < 90,
    checkUp: (_, angle) => angle > 160,
    getAngle: (landmarks) => calculateAngle(
      landmarks[POSE.LEFT_HIP],
      landmarks[POSE.LEFT_KNEE],
      landmarks[POSE.LEFT_ANKLE]
    ),
    tips: ["Keep back straight", "Knees over toes", "Go parallel or below"],
  },
  pushups: {
    name: "Push-ups",
    emoji: "💪",
    description: "Lower chest to ground, push back up",
    checkDown: (_, angle) => angle < 90,
    checkUp: (_, angle) => angle > 160,
    getAngle: (landmarks) => calculateAngle(
      landmarks[POSE.LEFT_SHOULDER],
      landmarks[POSE.LEFT_ELBOW],
      landmarks[POSE.LEFT_WRIST]
    ),
    tips: ["Keep body straight", "Elbows at 45°", "Full range of motion"],
  },
  lunges: {
    name: "Lunges",
    emoji: "🏃",
    description: "Step forward, lower back knee",
    checkDown: (landmarks, angle) => {
      const frontKneeAngle = calculateAngle(
        landmarks[POSE.LEFT_HIP],
        landmarks[POSE.LEFT_KNEE],
        landmarks[POSE.LEFT_ANKLE]
      );
      return frontKneeAngle < 100;
    },
    checkUp: (_, angle) => angle > 160,
    getAngle: (landmarks) => calculateAngle(
      landmarks[POSE.LEFT_HIP],
      landmarks[POSE.LEFT_KNEE],
      landmarks[POSE.LEFT_ANKLE]
    ),
    tips: ["Front knee at 90°", "Back knee near ground", "Keep torso upright"],
  },
  jumping_jacks: {
    name: "Jumping Jacks",
    emoji: "⭐",
    description: "Jump with arms and legs spread",
    checkDown: (landmarks) => {
      const armAngle = calculateAngle(
        landmarks[POSE.LEFT_HIP],
        landmarks[POSE.LEFT_SHOULDER],
        landmarks[POSE.LEFT_WRIST]
      );
      return armAngle < 45;
    },
    checkUp: (landmarks) => {
      const armAngle = calculateAngle(
        landmarks[POSE.LEFT_HIP],
        landmarks[POSE.LEFT_SHOULDER],
        landmarks[POSE.LEFT_WRIST]
      );
      return armAngle > 150;
    },
    getAngle: (landmarks) => calculateAngle(
      landmarks[POSE.LEFT_HIP],
      landmarks[POSE.LEFT_SHOULDER],
      landmarks[POSE.LEFT_WRIST]
    ),
    tips: ["Arms fully extended", "Jump with both feet", "Land softly"],
  },
  arm_raises: {
    name: "Arm Raises",
    emoji: "🙌",
    description: "Raise arms overhead, lower down",
    checkDown: (landmarks) => {
      const armAngle = calculateAngle(
        landmarks[POSE.LEFT_HIP],
        landmarks[POSE.LEFT_SHOULDER],
        landmarks[POSE.LEFT_WRIST]
      );
      return armAngle < 30;
    },
    checkUp: (landmarks) => {
      const armAngle = calculateAngle(
        landmarks[POSE.LEFT_HIP],
        landmarks[POSE.LEFT_SHOULDER],
        landmarks[POSE.LEFT_WRIST]
      );
      return armAngle > 160;
    },
    getAngle: (landmarks) => calculateAngle(
      landmarks[POSE.LEFT_HIP],
      landmarks[POSE.LEFT_SHOULDER],
      landmarks[POSE.LEFT_WRIST]
    ),
    tips: ["Keep arms straight", "Control the movement", "Breathe steadily"],
  },
  high_knees: {
    name: "High Knees",
    emoji: "🦶",
    description: "Lift knees to hip level alternating",
    checkDown: (landmarks) => {
      const leftKneeHeight = landmarks[POSE.LEFT_KNEE].y;
      const leftHipHeight = landmarks[POSE.LEFT_HIP].y;
      const rightKneeHeight = landmarks[POSE.RIGHT_KNEE].y;
      const rightHipHeight = landmarks[POSE.RIGHT_HIP].y;
      // Both knees below hips
      return leftKneeHeight > leftHipHeight && rightKneeHeight > rightHipHeight;
    },
    checkUp: (landmarks) => {
      const leftKneeHeight = landmarks[POSE.LEFT_KNEE].y;
      const leftHipHeight = landmarks[POSE.LEFT_HIP].y;
      const rightKneeHeight = landmarks[POSE.RIGHT_KNEE].y;
      const rightHipHeight = landmarks[POSE.RIGHT_HIP].y;
      // Either knee at or above hip level
      return leftKneeHeight <= leftHipHeight || rightKneeHeight <= rightHipHeight;
    },
    getAngle: (landmarks) => {
      // Return the higher knee's angle relative to hip
      const leftAngle = calculateAngle(
        landmarks[POSE.LEFT_SHOULDER],
        landmarks[POSE.LEFT_HIP],
        landmarks[POSE.LEFT_KNEE]
      );
      const rightAngle = calculateAngle(
        landmarks[POSE.RIGHT_SHOULDER],
        landmarks[POSE.RIGHT_HIP],
        landmarks[POSE.RIGHT_KNEE]
      );
      return Math.min(leftAngle, rightAngle);
    },
    tips: ["Pump your arms", "Stay on balls of feet", "Keep core tight"],
  },
};

/**
 * Pose Estimation page with multiple exercise counters
 * Uses MediaPipe Pose Landmarker for body tracking and rep counting
 */
export default function PoseEstimation() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  
  // Exercise state
  const [exercise, setExercise] = useState<ExerciseType>("none");
  const [repCount, setRepCount] = useState(0);
  const [isDown, setIsDown] = useState(false);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [feedback, setFeedback] = useState("");
  
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
        if (exercise !== "none") {
          const config = exercises[exercise];
          const angle = config.getAngle(landmarks);
          setCurrentAngle(Math.round(angle));
          
          if (config.checkDown(landmarks, angle) && !isDown) {
            setIsDown(true);
            setFeedback("Down! ⬇️");
          } else if (config.checkUp(landmarks, angle) && isDown) {
            setIsDown(false);
            setRepCount(prev => prev + 1);
            setFeedback("Up! ⬆️ +1");
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
          ctx.fillRect(20, 20, 140, 50);
          ctx.fillStyle = "hsl(142, 76%, 45%)";
          ctx.font = "bold 20px 'JetBrains Mono'";
          ctx.fillText(`${currentAngle}°`, 30, 50);
          ctx.font = "14px 'JetBrains Mono'";
          ctx.fillText(feedback, 30, 65);
        }
      }
    } catch (err) {
      console.error("Pose detection error:", err);
    }

    animationRef.current = requestAnimationFrame(processFrame);
  }, [isRunning, exercise, isDown, currentAngle, feedback]);

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
  
  const selectExercise = (ex: ExerciseType) => {
    setExercise(ex);
    setRepCount(0);
    setIsDown(false);
    setFeedback("");
  };

  const resetCounter = () => {
    setRepCount(0);
    setIsDown(false);
    setFeedback("");
  };

  const stats = [
    { label: "Exercise", value: exercise === "none" ? "None" : exercises[exercise].name, color: "green" as const },
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
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <p className="text-sm font-medium sticky top-0 bg-card py-1">Select Exercise:</p>
              {(Object.keys(exercises) as Exclude<ExerciseType, "none">[]).map((ex) => {
                const config = exercises[ex];
                return (
                  <Button
                    key={ex}
                    variant={exercise === ex ? "gradient" : "outline"}
                    className="w-full justify-start gap-3"
                    onClick={() => selectExercise(ex)}
                  >
                    <span className="text-xl">{config.emoji}</span>
                    <div className="text-left">
                      <span className="block">{config.name}</span>
                      <span className="text-xs text-muted-foreground">{config.description}</span>
                    </div>
                  </Button>
                );
              })}
            </div>

            {exercise !== "none" && (
              <Button
                variant="outline"
                className="w-full mt-4 gap-2"
                onClick={resetCounter}
              >
                <RotateCcw className="w-4 h-4" />
                Reset Counter
              </Button>
            )}

            {/* Exercise tips */}
            {exercise !== "none" && (
              <div className="mt-4 pt-4 border-t border-border">
                <h4 className="text-sm font-medium mb-2">Tips for {exercises[exercise].name}:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {exercises[exercise].tips.map((tip, i) => (
                    <li key={i}>• {tip}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="text-sm font-medium mb-2">General Tips:</h4>
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
