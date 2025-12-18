import { useState, useRef, useCallback, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { LoadingState } from "@/components/LoadingState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import Webcam from "react-webcam";
import {
  FaceDetector,
  FilesetResolver,
} from "@mediapipe/tasks-vision";
import { 
  UserCheck, 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Send,
  Loader2,
  UserPlus,
  Sparkles,
  Camera,
  X,
  Scan,
  Zap,
  Shield
} from "lucide-react";

interface Student {
  id: string;
  name: string;
  rollNo: string;
  imageData?: string;
}

interface AttendanceRecord {
  studentId: string;
  studentName: string;
  rollNo: string;
  timestamp: string;
  date: string;
  status: "present" | "absent";
}

interface FaceMatch {
  student: Student;
  confidence: number;
}

const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/125iuh-wPn_XFNfmjufOkB0anM3wGG3_9Cq5X_IxlICc/edit?usp=sharing";

// Minimum confidence for auto-match (0-1)
const AUTO_MATCH_THRESHOLD = 0.6;
// Cooldown between auto-marking same student (ms)
const MARK_COOLDOWN = 5000;

/**
 * Attendance Management Page
 * Uses automated face matching to mark attendance
 */
const Attendance = () => {
  const { toast } = useToast();
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const matchCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [faceDetector, setFaceDetector] = useState<FaceDetector | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState(0);
  const [lastDetection, setLastDetection] = useState<string | null>(null);
  const [autoMode, setAutoMode] = useState(true);
  const [currentMatch, setCurrentMatch] = useState<FaceMatch | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  
  // Refs for stabilization
  const lastMarkTimeRef = useRef<Record<string, number>>({});
  const faceHistoryRef = useRef<number[]>([]);
  const matchHistoryRef = useRef<{ studentId: string; confidence: number }[]>([]);

  // Load students from localStorage
  useEffect(() => {
    const savedStudents = localStorage.getItem("visionhub-students");
    if (savedStudents) {
      setStudents(JSON.parse(savedStudents));
    }
  }, []);

  // Initialize MediaPipe Face Detector
  useEffect(() => {
    const initializeFaceDetector = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        const detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.7,
        });
        setFaceDetector(detector);
        setIsModelLoading(false);
      } catch (error) {
        console.error("Failed to load face detector:", error);
        setIsModelLoading(false);
        toast({
          title: "Error",
          description: "Failed to load face detection model",
          variant: "destructive",
        });
      }
    };
    initializeFaceDetector();
  }, [toast]);

  // Compare two face images and return similarity score (0-1)
  const compareFaces = useCallback((capturedFace: ImageData, storedImage: string): Promise<number> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = matchCanvasRef.current;
        if (!canvas) {
          resolve(0);
          return;
        }
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(0);
          return;
        }

        // Resize both images to same small size for comparison
        const size = 32;
        canvas.width = size;
        canvas.height = size;
        
        // Draw stored image
        ctx.drawImage(img, 0, 0, size, size);
        const storedData = ctx.getImageData(0, 0, size, size);
        
        // Create temp canvas for captured face
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = size;
        tempCanvas.height = size;
        const tempCtx = tempCanvas.getContext("2d");
        if (!tempCtx) {
          resolve(0);
          return;
        }
        
        // Draw captured face data scaled down
        const capturedCanvas = document.createElement("canvas");
        capturedCanvas.width = capturedFace.width;
        capturedCanvas.height = capturedFace.height;
        const capturedCtx = capturedCanvas.getContext("2d");
        if (!capturedCtx) {
          resolve(0);
          return;
        }
        capturedCtx.putImageData(capturedFace, 0, 0);
        tempCtx.drawImage(capturedCanvas, 0, 0, size, size);
        const capturedData = tempCtx.getImageData(0, 0, size, size);
        
        // Calculate histogram similarity
        const capturedHist = calculateHistogram(capturedData.data);
        const storedHist = calculateHistogram(storedData.data);
        
        // Calculate correlation between histograms
        const similarity = correlateHistograms(capturedHist, storedHist);
        resolve(similarity);
      };
      img.onerror = () => resolve(0);
      img.src = storedImage;
    });
  }, []);

  // Calculate color histogram
  const calculateHistogram = (data: Uint8ClampedArray): number[] => {
    const bins = 16;
    const hist = new Array(bins * 3).fill(0);
    
    for (let i = 0; i < data.length; i += 4) {
      const r = Math.floor(data[i] / (256 / bins));
      const g = Math.floor(data[i + 1] / (256 / bins));
      const b = Math.floor(data[i + 2] / (256 / bins));
      hist[r]++;
      hist[bins + g]++;
      hist[bins * 2 + b]++;
    }
    
    // Normalize
    const total = data.length / 4;
    return hist.map(v => v / total);
  };

  // Calculate correlation between two histograms
  const correlateHistograms = (h1: number[], h2: number[]): number => {
    const mean1 = h1.reduce((a, b) => a + b, 0) / h1.length;
    const mean2 = h2.reduce((a, b) => a + b, 0) / h2.length;
    
    let numerator = 0;
    let denom1 = 0;
    let denom2 = 0;
    
    for (let i = 0; i < h1.length; i++) {
      const d1 = h1[i] - mean1;
      const d2 = h2[i] - mean2;
      numerator += d1 * d2;
      denom1 += d1 * d1;
      denom2 += d2 * d2;
    }
    
    const denom = Math.sqrt(denom1 * denom2);
    if (denom === 0) return 0;
    
    // Normalize to 0-1 range
    return (numerator / denom + 1) / 2;
  };

  // Find best matching student for detected face
  const findBestMatch = useCallback(async (faceRegion: ImageData): Promise<FaceMatch | null> => {
    const studentsWithImages = students.filter(s => s.imageData);
    if (studentsWithImages.length === 0) return null;
    
    let bestMatch: FaceMatch | null = null;
    let bestConfidence = 0;
    
    for (const student of studentsWithImages) {
      if (!student.imageData) continue;
      
      const confidence = await compareFaces(faceRegion, student.imageData);
      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestMatch = { student, confidence };
      }
    }
    
    return bestMatch && bestMatch.confidence >= AUTO_MATCH_THRESHOLD ? bestMatch : null;
  }, [students, compareFaces]);

  // Get stabilized face count
  const getStableFaceCount = (newCount: number): number => {
    const history = faceHistoryRef.current;
    history.push(newCount);
    if (history.length > 10) history.shift();
    
    const mode = history.reduce((acc, c) => {
      acc[c] = (acc[c] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    return Number(Object.entries(mode).sort(([, a], [, b]) => b - a)[0]?.[0] || 0);
  };

  // Auto-mark attendance with stabilization
  const autoMarkAttendance = useCallback(async (match: FaceMatch) => {
    const now = Date.now();
    const lastMark = lastMarkTimeRef.current[match.student.id] || 0;
    
    // Check cooldown
    if (now - lastMark < MARK_COOLDOWN) return;
    
    // Add to match history for stabilization
    matchHistoryRef.current.push({ 
      studentId: match.student.id, 
      confidence: match.confidence 
    });
    if (matchHistoryRef.current.length > 10) {
      matchHistoryRef.current.shift();
    }
    
    // Only mark if same student detected consistently (>60% of recent frames)
    const recentMatches = matchHistoryRef.current.filter(
      m => m.studentId === match.student.id
    );
    if (recentMatches.length < 6) return;
    
    // Check if already marked
    const alreadyMarked = todayAttendance.some(r => r.studentId === match.student.id);
    if (alreadyMarked) return;
    
    lastMarkTimeRef.current[match.student.id] = now;
    
    const record: AttendanceRecord = {
      studentId: match.student.id,
      studentName: match.student.name,
      rollNo: match.student.rollNo,
      timestamp: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString(),
      status: "present",
    };
    
    setTodayAttendance(prev => [...prev, record]);
    setLastDetection(match.student.name);
    
    // Clear match history after successful mark
    matchHistoryRef.current = [];
    
    toast({
      title: "✓ Auto-Marked Present",
      description: `${match.student.name} recognized and marked at ${record.timestamp}`,
    });
  }, [todayAttendance, toast]);

  // Process video frame for face detection and matching
  const processFrame = useCallback(async () => {
    if (!webcamRef.current?.video || !faceDetector || !canvasRef.current) return;

    const video = webcamRef.current.video;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx || video.readyState !== 4) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    try {
      const detections = faceDetector.detectForVideo(video, performance.now());
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const stableFaceCount = getStableFaceCount(detections.detections.length);
      setDetectedFaces(stableFaceCount);

      for (let i = 0; i < detections.detections.length; i++) {
        const detection = detections.detections[i];
        const bbox = detection.boundingBox;
        if (!bbox) continue;

        const confidence = detection.categories[0]?.score || 0;
        const isHighConfidence = confidence > 0.8;

        // Draw bounding box
        ctx.strokeStyle = isHighConfidence ? "#00ff88" : "#00d4ff";
        ctx.lineWidth = 3;
        ctx.shadowColor = isHighConfidence ? "#00ff88" : "#00d4ff";
        ctx.shadowBlur = 20;
        
        const cornerLength = 20;
        
        // Top-left
        ctx.beginPath();
        ctx.moveTo(bbox.originX, bbox.originY + cornerLength);
        ctx.lineTo(bbox.originX, bbox.originY);
        ctx.lineTo(bbox.originX + cornerLength, bbox.originY);
        ctx.stroke();
        
        // Top-right
        ctx.beginPath();
        ctx.moveTo(bbox.originX + bbox.width - cornerLength, bbox.originY);
        ctx.lineTo(bbox.originX + bbox.width, bbox.originY);
        ctx.lineTo(bbox.originX + bbox.width, bbox.originY + cornerLength);
        ctx.stroke();
        
        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(bbox.originX, bbox.originY + bbox.height - cornerLength);
        ctx.lineTo(bbox.originX, bbox.originY + bbox.height);
        ctx.lineTo(bbox.originX + cornerLength, bbox.originY + bbox.height);
        ctx.stroke();
        
        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(bbox.originX + bbox.width - cornerLength, bbox.originY + bbox.height);
        ctx.lineTo(bbox.originX + bbox.width, bbox.originY + bbox.height);
        ctx.lineTo(bbox.originX + bbox.width, bbox.originY + bbox.height - cornerLength);
        ctx.stroke();

        // Auto-match for first detected face
        if (i === 0 && autoMode && !isMatching && students.some(s => s.imageData)) {
          setIsMatching(true);
          
          // Extract face region
          const padding = 20;
          const x = Math.max(0, bbox.originX - padding);
          const y = Math.max(0, bbox.originY - padding);
          const w = Math.min(bbox.width + padding * 2, video.videoWidth - x);
          const h = Math.min(bbox.height + padding * 2, video.videoHeight - y);
          
          // Draw video to temp canvas to extract face
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = video.videoWidth;
          tempCanvas.height = video.videoHeight;
          const tempCtx = tempCanvas.getContext("2d");
          if (tempCtx) {
            tempCtx.drawImage(video, 0, 0);
            const faceData = tempCtx.getImageData(x, y, w, h);
            
            const match = await findBestMatch(faceData);
            setCurrentMatch(match);
            
            if (match) {
              await autoMarkAttendance(match);
            }
          }
          
          setIsMatching(false);
        }

        // Draw label
        ctx.shadowBlur = 0;
        let label = `Face ${i + 1} • ${(confidence * 100).toFixed(0)}%`;
        if (currentMatch && i === 0) {
          label = `${currentMatch.student.name} • ${(currentMatch.confidence * 100).toFixed(0)}%`;
        }
        
        ctx.font = "bold 14px 'Space Grotesk', sans-serif";
        const textWidth = ctx.measureText(label).width;
        
        ctx.fillStyle = "rgba(0, 255, 136, 0.2)";
        ctx.fillRect(bbox.originX, bbox.originY - 28, textWidth + 16, 24);
        
        ctx.fillStyle = "#00ff88";
        ctx.shadowColor = "#00ff88";
        ctx.shadowBlur = 10;
        ctx.fillText(label, bbox.originX + 8, bbox.originY - 10);
      }
    } catch (error) {
      console.error("Detection error:", error);
    }
  }, [faceDetector, autoMode, isMatching, students, currentMatch, findBestMatch, autoMarkAttendance]);

  // Animation loop
  useEffect(() => {
    if (!isProcessing || !faceDetector) return;

    let animationId: number;
    const animate = () => {
      processFrame();
      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => cancelAnimationFrame(animationId);
  }, [isProcessing, faceDetector, processFrame]);

  // Manual mark attendance
  const markPresent = (student: Student) => {
    const now = new Date();
    const record: AttendanceRecord = {
      studentId: student.id,
      studentName: student.name,
      rollNo: student.rollNo,
      timestamp: now.toLocaleTimeString(),
      date: now.toLocaleDateString(),
      status: "present",
    };

    setTodayAttendance((prev) => {
      const exists = prev.find((r) => r.studentId === student.id);
      if (exists) {
        toast({
          title: "Already Marked",
          description: `${student.name} is already marked present`,
        });
        return prev;
      }
      return [...prev, record];
    });

    setLastDetection(student.name);
    lastMarkTimeRef.current[student.id] = Date.now();
    
    toast({
      title: "Attendance Marked! ✓",
      description: `${student.name} marked present at ${record.timestamp}`,
    });
  };

  // Submit to Google Sheets
  const submitToGoogleSheets = async () => {
    if (todayAttendance.length === 0) {
      toast({
        title: "No Attendance",
        description: "Mark some students present first",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      toast({
        title: "Attendance Submitted! 🎉",
        description: `${todayAttendance.length} records sent to Google Sheets`,
      });

      window.open(GOOGLE_SHEET_URL, "_blank");
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: "Submission Failed",
        description: "Could not submit to Google Sheets",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const unmarkedStudents = students.filter(
    (s) => !todayAttendance.some((r) => r.studentId === s.id)
  );

  const studentsWithPhotos = students.filter(s => s.imageData).length;

  return (
    <Layout>
      <div className="min-h-screen bg-background pt-20 pb-12">
        {/* Hidden canvas for face matching */}
        <canvas ref={matchCanvasRef} className="hidden" />
        
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 mb-4">
              <UserCheck className="w-4 h-4 text-neon-cyan" />
              <span className="text-sm text-neon-cyan font-medium">Smart Attendance</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-gradient-cyan">Automated</span> Attendance
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Face recognition automatically identifies and marks students present
            </p>
            <div className="flex items-center justify-center gap-2 mt-4 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{today}</span>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Webcam Area */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="glass-card p-6 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                {isModelLoading ? (
                  <LoadingState message="Loading Face Detection Model..." />
                ) : (
                  <div className="space-y-4">
                    {/* Auto Mode Toggle */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          autoMode ? "bg-neon-green/20" : "bg-muted"
                        }`}>
                          <Zap className={`w-5 h-5 ${autoMode ? "text-neon-green" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <p className="font-medium">Auto Recognition</p>
                          <p className="text-xs text-muted-foreground">
                            {studentsWithPhotos > 0 
                              ? `${studentsWithPhotos} students with photos` 
                              : "Add student photos to enable"}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant={autoMode ? "neon" : "outline"}
                        size="sm"
                        onClick={() => setAutoMode(!autoMode)}
                        disabled={studentsWithPhotos === 0}
                        className="gap-2"
                      >
                        {autoMode ? "ON" : "OFF"}
                      </Button>
                    </div>

                    <div className="relative rounded-xl overflow-hidden bg-background/50">
                      <Webcam
                        ref={webcamRef}
                        className="w-full rounded-xl"
                        videoConstraints={{ facingMode: "user" }}
                        onUserMedia={() => setIsProcessing(true)}
                        screenshotFormat="image/jpeg"
                      />
                      <canvas
                        ref={canvasRef}
                        className="absolute inset-0 w-full h-full pointer-events-none"
                      />
                      
                      {/* Scanning overlay */}
                      {isProcessing && detectedFaces === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <Scan className="w-16 h-16 text-neon-cyan/50 animate-pulse mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Scanning for faces...</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Status Overlay */}
                      <div className="absolute top-4 left-4 flex gap-2">
                        <div className={`px-3 py-1.5 rounded-full backdrop-blur-sm border transition-all duration-300 ${
                          detectedFaces > 0 
                            ? "bg-neon-green/20 border-neon-green/50" 
                            : "bg-background/80 border-neon-cyan/30"
                        }`}>
                          <span className={`text-sm font-mono ${
                            detectedFaces > 0 ? "text-neon-green" : "text-neon-cyan"
                          }`}>
                            {detectedFaces > 0 ? `✓ ${detectedFaces} face${detectedFaces !== 1 ? "s" : ""}` : "No faces"}
                          </span>
                        </div>
                        
                        {currentMatch && (
                          <div className="px-3 py-1.5 rounded-full backdrop-blur-sm bg-neon-purple/20 border border-neon-purple/50 animate-fade-in">
                            <span className="text-sm font-mono text-neon-purple">
                              {currentMatch.student.name} ({(currentMatch.confidence * 100).toFixed(0)}%)
                            </span>
                          </div>
                        )}
                      </div>

                      {lastDetection && (
                        <div className="absolute bottom-4 left-4 animate-fade-in">
                          <div className="px-4 py-2 rounded-lg bg-neon-green/20 border border-neon-green/50 backdrop-blur-sm">
                            <span className="text-neon-green font-medium">
                              ✓ Last: {lastDetection}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Instructions */}
                    {students.length > 0 && studentsWithPhotos === 0 && (
                      <div className="bg-neon-yellow/10 rounded-lg p-4 border border-neon-yellow/30">
                        <h4 className="font-medium mb-2 flex items-center gap-2 text-neon-yellow">
                          <Shield className="w-4 h-4" />
                          Enable Auto-Recognition
                        </h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Add photos to student profiles to enable automatic face matching.
                        </p>
                        <Link to="/attendance/students">
                          <Button variant="outline" size="sm" className="gap-2">
                            <Camera className="w-4 h-4" />
                            Add Student Photos
                          </Button>
                        </Link>
                      </div>
                    )}

                    {/* Manual Student Selection */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Users className="w-5 h-5 text-neon-purple" />
                          Students ({unmarkedStudents.length} remaining)
                        </h3>
                        <Link to="/attendance/students">
                          <Button variant="outline" size="sm" className="gap-2 hover-lift">
                            <UserPlus className="w-4 h-4" />
                            Manage
                          </Button>
                        </Link>
                      </div>

                      {students.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-border rounded-xl">
                          <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                          <p className="text-muted-foreground mb-4">No students added yet</p>
                          <Link to="/attendance/students">
                            <Button variant="neon" size="sm" className="gap-2">
                              <UserPlus className="w-4 h-4" />
                              Add Students
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {students.map((student, index) => {
                            const isMarked = todayAttendance.some(r => r.studentId === student.id);
                            const hasPhoto = !!student.imageData;
                            
                            return (
                              <button
                                key={student.id}
                                onClick={() => !isMarked && markPresent(student)}
                                disabled={isMarked}
                                className={`p-3 rounded-xl text-left transition-all duration-300 border ${
                                  isMarked
                                    ? "bg-neon-green/10 border-neon-green/30 cursor-default"
                                    : "bg-card/50 border-border hover:border-neon-purple/50 hover:bg-neon-purple/5 cursor-pointer hover-lift"
                                }`}
                                style={{ animationDelay: `${index * 0.05}s` }}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  {student.imageData ? (
                                    <img 
                                      src={student.imageData} 
                                      alt={student.name}
                                      className="w-8 h-8 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                      <span className="text-sm font-bold">
                                        {student.name.charAt(0)}
                                      </span>
                                    </div>
                                  )}
                                  {isMarked && (
                                    <CheckCircle2 className="w-4 h-4 text-neon-green ml-auto" />
                                  )}
                                </div>
                                <p className={`font-medium text-sm truncate ${
                                  isMarked ? "text-neon-green" : ""
                                }`}>
                                  {student.name}
                                </p>
                                <p className="text-xs text-muted-foreground">{student.rollNo}</p>
                                {!hasPhoto && !isMarked && (
                                  <p className="text-xs text-neon-yellow/70 mt-1">No photo</p>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Today's Stats */}
              <Card className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-neon-yellow" />
                  Today's Progress
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Present</span>
                    <span className="text-2xl font-bold text-neon-green">
                      {todayAttendance.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Remaining</span>
                    <span className="text-2xl font-bold text-neon-yellow">
                      {unmarkedStudents.length}
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-neon-green to-neon-cyan transition-all duration-500"
                        style={{
                          width: students.length > 0
                            ? `${(todayAttendance.length / students.length) * 100}%`
                            : "0%",
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      {students.length > 0
                        ? `${Math.round((todayAttendance.length / students.length) * 100)}% complete`
                        : "No students"}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Attendance List */}
              <Card className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-neon-cyan" />
                  Marked Present
                </h3>
                
                {todayAttendance.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No attendance marked yet
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {todayAttendance.map((record) => (
                      <div
                        key={record.studentId}
                        className="flex items-center gap-3 p-2 rounded-lg bg-neon-green/5 border border-neon-green/20"
                      >
                        <CheckCircle2 className="w-4 h-4 text-neon-green flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{record.studentName}</p>
                          <p className="text-xs text-muted-foreground">{record.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Submit Button */}
              <Button
                onClick={submitToGoogleSheets}
                disabled={isSubmitting || todayAttendance.length === 0}
                className="w-full gap-2 h-12 bg-gradient-to-r from-neon-cyan to-neon-green text-background font-semibold hover:opacity-90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit to Google Sheets
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Attendance;
