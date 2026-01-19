import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { LoadingState } from "@/components/LoadingState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModelLearnContent } from "@/components/ModelLearnContent";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import Webcam from "react-webcam";
import { useStudents, Student } from "@/hooks/useStudents";
import { useAttendance } from "@/hooks/useAttendance";
import { useAuth } from "@/hooks/useAuth";
import { useVoiceAnnouncement } from "@/hooks/useVoiceAnnouncement";
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
  Loader2,
  UserPlus,
  Download,
  Save,
  Scan,
  Zap,
  Volume2,
  VolumeX,
  UserMinus,
  Cloud,
  GraduationCap,
  Video,
} from "lucide-react";

interface FaceMatch {
  student: Student;
  confidence: number;
}

// Minimum confidence for auto-match (0-1)
const AUTO_MATCH_THRESHOLD = 0.6;
// Cooldown between auto-marking same student (ms)
const MARK_COOLDOWN = 5000;

/**
 * Attendance Management Page
 * Uses automated face matching to mark attendance
 */
const Attendance = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const matchCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const { students, loading: studentsLoading } = useStudents();
  const { 
    records: todayAttendance, 
    loading: attendanceLoading,
    saving,
    markPresent: markPresentInDb,
    removePresent: removePresentFromDb,
    exportToCSV,
    fetchAllAttendance,
    syncToGoogleSheets,
  } = useAttendance();
  
  const { isEnabled: voiceEnabled, announce, toggle: toggleVoice } = useVoiceAnnouncement();
  
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [faceDetector, setFaceDetector] = useState<FaceDetector | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState(0);
  const [lastDetection, setLastDetection] = useState<string | null>(null);
  const [autoMode, setAutoMode] = useState(true);
  const [currentMatch, setCurrentMatch] = useState<FaceMatch | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Refs for stabilization
  const lastMarkTimeRef = useRef<Record<string, number>>({});
  const faceHistoryRef = useRef<number[]>([]);
  const matchHistoryRef = useRef<{ studentId: string; confidence: number }[]>([]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

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
  const compareFaces = useCallback((capturedFace: ImageData, storedImageUrl: string): Promise<number> => {
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
      img.src = storedImageUrl;
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
    const studentsWithImages = students.filter(s => s.imageUrl);
    if (studentsWithImages.length === 0) return null;
    
    let bestMatch: FaceMatch | null = null;
    let bestConfidence = 0;
    
    for (const student of studentsWithImages) {
      if (!student.imageUrl) continue;
      
      const confidence = await compareFaces(faceRegion, student.imageUrl);
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
    
    const result = await markPresentInDb(
      match.student.id,
      match.student.name,
      match.student.rollNo
    );
    
    if (result.success) {
      setLastDetection(match.student.name);
      matchHistoryRef.current = [];
      
      // Announce the student's name
      announce(match.student.name);
      
      toast({
        title: "✓ Auto-Marked Present",
        description: `${match.student.name} recognized and saved`,
      });
    }
  }, [todayAttendance, toast, markPresentInDb, announce]);

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
        if (i === 0 && autoMode && !isMatching && students.some(s => s.imageUrl)) {
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
  const markPresent = async (student: Student) => {
    const exists = todayAttendance.find((r) => r.studentId === student.id);
    if (exists) {
      toast({
        title: "Already Marked",
        description: `${student.name} is already marked present`,
      });
      return;
    }

    const result = await markPresentInDb(student.id, student.name, student.rollNo);
    
    if (result.success) {
      setLastDetection(student.name);
      lastMarkTimeRef.current[student.id] = Date.now();
      
      // Announce the student's name
      announce(student.name);
      
      toast({
        title: "Attendance Marked! ✓",
        description: `${student.name} marked present and saved`,
      });
    }
  };

  // Remove from present
  const removePresent = async (studentId: string, studentName: string) => {
    const record = todayAttendance.find((r) => r.studentId === studentId);
    if (!record) return;

    const success = await removePresentFromDb(record.id);
    if (success) {
      toast({
        title: "Removed",
        description: `${studentName} removed from present list`,
      });
    }
  };

  // Sync to Google Sheets
  const handleSyncToSheets = async () => {
    setIsSyncing(true);
    await syncToGoogleSheets();
    setIsSyncing(false);
  };

  // Export all attendance records
  const handleExportAll = async () => {
    setIsExporting(true);
    const allRecords = await fetchAllAttendance();
    exportToCSV(allRecords, `all_attendance_${new Date().toISOString().split('T')[0]}.csv`);
    setIsExporting(false);
  };

  // Export today's attendance
  const handleExportToday = () => {
    exportToCSV(todayAttendance);
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const presentCount = todayAttendance.length;
  const totalStudents = students.length;

  if (isModelLoading || studentsLoading || attendanceLoading) {
    return (
      <Layout>
        <LoadingState
          message="Loading Attendance System"
          subMessage="Initializing face detection and loading students..."
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background pt-20 pb-12">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="mb-8 animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  <span className="text-gradient-purple">Smart</span> Attendance
                </h1>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {today}
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>
              </div>
              <Link to="/attendance/students">
                <Button
                  variant="outline"
                  className="gap-2 hover:border-neon-purple/50"
                >
                  <Users className="w-4 h-4" />
                  Manage Students
                </Button>
              </Link>
            </div>
          </div>

          {/* Tabs for Demo and Learn */}
          <Tabs defaultValue="demo" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="demo" className="gap-2">
                <Video className="w-4 h-4" />
                Live Demo
              </TabsTrigger>
              <TabsTrigger value="learn" className="gap-2">
                <GraduationCap className="w-4 h-4" />
                Learn How It Works
              </TabsTrigger>
            </TabsList>

            <TabsContent value="demo" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
            {/* Camera Section */}
            <div className="space-y-4">
              <Card className="glass-card overflow-hidden animate-fade-in-up">
                <div className="relative aspect-video bg-background/50">
                  <Webcam
                    ref={webcamRef}
                    className="w-full h-full object-cover"
                    videoConstraints={{
                      facingMode: "user",
                      width: 640,
                      height: 480,
                    }}
                    onUserMedia={() => setIsProcessing(true)}
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full"
                  />
                  <canvas ref={matchCanvasRef} className="hidden" />

                  {/* Overlay UI */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full">
                      <div className={`w-2 h-2 rounded-full ${isProcessing ? "bg-neon-green animate-pulse" : "bg-muted"}`} />
                      <span className="text-sm font-medium">
                        {isProcessing ? "Scanning" : "Paused"}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full">
                      <Scan className="w-4 h-4 text-neon-cyan" />
                      <span className="text-sm font-medium">
                        {detectedFaces} face{detectedFaces !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Last Detection */}
                  {lastDetection && (
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center">
                      <div className="bg-neon-green/20 backdrop-blur-sm border border-neon-green/50 px-4 py-2 rounded-full animate-fade-in">
                        <span className="text-sm font-medium text-neon-green">
                          ✓ {lastDetection} marked present
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Controls */}
              <div className="grid grid-cols-2 gap-4">
                {/* Auto Mode Toggle */}
                <Card className="glass-card p-4 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-neon-purple/10 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-neon-purple" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Auto Recognition</p>
                        <p className="text-xs text-muted-foreground">
                          Auto-mark when recognized
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={autoMode ? "default" : "outline"}
                      onClick={() => setAutoMode(!autoMode)}
                      className={autoMode ? "bg-neon-green hover:bg-neon-green/80" : ""}
                    >
                      {autoMode ? "ON" : "OFF"}
                    </Button>
                  </div>
                </Card>

                {/* Voice Announcement Toggle */}
                <Card className="glass-card p-4 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-neon-cyan/10 flex items-center justify-center">
                        {voiceEnabled ? (
                          <Volume2 className="w-5 h-5 text-neon-cyan" />
                        ) : (
                          <VolumeX className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">Voice Announce</p>
                        <p className="text-xs text-muted-foreground">
                          Speak student names
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={voiceEnabled ? "default" : "outline"}
                      onClick={toggleVoice}
                      className={voiceEnabled ? "bg-neon-cyan hover:bg-neon-cyan/80" : ""}
                    >
                      {voiceEnabled ? "ON" : "OFF"}
                    </Button>
                  </div>
                </Card>
              </div>
            </div>

            {/* Attendance Panel */}
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="glass-card p-4 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-neon-green/10 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-neon-green" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-neon-green">{presentCount}</p>
                      <p className="text-sm text-muted-foreground">Present</p>
                    </div>
                  </div>
                </Card>
                <Card className="glass-card p-4 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-neon-pink/10 flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-neon-pink" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-neon-pink">{totalStudents - presentCount}</p>
                      <p className="text-sm text-muted-foreground">Absent</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Student List */}
              <Card className="glass-card p-4 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Student List
                </h3>
                
                {students.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                      <UserPlus className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground mb-4">No students added yet</p>
                    <Link to="/attendance/students">
                      <Button className="gap-2 bg-gradient-to-r from-neon-purple to-neon-pink">
                        <UserPlus className="w-4 h-4" />
                        Add Students
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                    {students.map((student) => {
                      const isPresent = todayAttendance.some(
                        (r) => r.studentId === student.id
                      );
                      return (
                        <div
                          key={student.id}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                            isPresent
                              ? "bg-neon-green/10 border-neon-green/30"
                              : "bg-muted/20 border-border hover:border-neon-purple/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {student.imageUrl ? (
                              <img
                                src={student.imageUrl}
                                alt={student.name}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-neon-purple/20 flex items-center justify-center">
                                <span className="font-bold text-neon-purple">
                                  {student.name.charAt(0)}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{student.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Roll: {student.rollNo}
                              </p>
                            </div>
                          </div>
                          {isPresent ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-neon-green flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" />
                                Present
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removePresent(student.id, student.name)}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-neon-pink hover:bg-neon-pink/10"
                                title="Remove from present"
                              >
                                <UserMinus className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markPresent(student)}
                              className="gap-1 hover:border-neon-green/50 hover:bg-neon-green/10"
                            >
                              <UserCheck className="w-4 h-4" />
                              Mark
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={handleExportToday}
                  disabled={todayAttendance.length === 0}
                  variant="outline"
                  className="gap-2 hover:border-neon-cyan/50"
                >
                  <Download className="w-4 h-4" />
                  Today
                </Button>
                <Button
                  onClick={handleExportAll}
                  disabled={isExporting}
                  variant="outline"
                  className="gap-2 hover:border-neon-purple/50"
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  All
                </Button>
                <Button
                  onClick={handleSyncToSheets}
                  disabled={isSyncing || todayAttendance.length === 0}
                  className="gap-2 bg-gradient-to-r from-neon-green to-neon-cyan hover:opacity-90"
                >
                  {isSyncing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Cloud className="w-4 h-4" />
                  )}
                  Sync
                </Button>
              </div>
            </div>
              </div>
            </TabsContent>

            <TabsContent value="learn">
              <div className="glass-card rounded-2xl p-6">
                <ModelLearnContent type="attendance" />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default Attendance;
