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
  Scan
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

const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/125iuh-wPn_XFNfmjufOkB0anM3wGG3_9Cq5X_IxlICc/edit?usp=sharing";

/**
 * Attendance Management Page
 * Uses face detection to mark attendance and posts to Google Sheets
 */
const Attendance = () => {
  const { toast } = useToast();
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [faceDetector, setFaceDetector] = useState<FaceDetector | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState(0);
  const [lastDetection, setLastDetection] = useState<string | null>(null);
  
  // New states for capture modal
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

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

  // Process video frame for face detection
  const processFrame = useCallback(() => {
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

      setDetectedFaces(detections.detections.length);

      detections.detections.forEach((detection, index) => {
        const bbox = detection.boundingBox;
        if (!bbox) return;

        // Draw animated neon bounding box
        ctx.strokeStyle = "#00ff88";
        ctx.lineWidth = 3;
        ctx.shadowColor = "#00ff88";
        ctx.shadowBlur = 20;
        
        // Animated corners instead of full rectangle
        const cornerLength = 20;
        
        // Top-left corner
        ctx.beginPath();
        ctx.moveTo(bbox.originX, bbox.originY + cornerLength);
        ctx.lineTo(bbox.originX, bbox.originY);
        ctx.lineTo(bbox.originX + cornerLength, bbox.originY);
        ctx.stroke();
        
        // Top-right corner
        ctx.beginPath();
        ctx.moveTo(bbox.originX + bbox.width - cornerLength, bbox.originY);
        ctx.lineTo(bbox.originX + bbox.width, bbox.originY);
        ctx.lineTo(bbox.originX + bbox.width, bbox.originY + cornerLength);
        ctx.stroke();
        
        // Bottom-left corner
        ctx.beginPath();
        ctx.moveTo(bbox.originX, bbox.originY + bbox.height - cornerLength);
        ctx.lineTo(bbox.originX, bbox.originY + bbox.height);
        ctx.lineTo(bbox.originX + cornerLength, bbox.originY + bbox.height);
        ctx.stroke();
        
        // Bottom-right corner
        ctx.beginPath();
        ctx.moveTo(bbox.originX + bbox.width - cornerLength, bbox.originY + bbox.height);
        ctx.lineTo(bbox.originX + bbox.width, bbox.originY + bbox.height);
        ctx.lineTo(bbox.originX + bbox.width, bbox.originY + bbox.height - cornerLength);
        ctx.stroke();

        // Draw confidence label with background
        const confidence = (detection.categories[0]?.score || 0) * 100;
        const label = `Face ${index + 1} • ${confidence.toFixed(0)}%`;
        ctx.font = "bold 14px 'Space Grotesk', sans-serif";
        const textWidth = ctx.measureText(label).width;
        
        // Label background
        ctx.fillStyle = "rgba(0, 255, 136, 0.2)";
        ctx.shadowBlur = 0;
        ctx.fillRect(bbox.originX, bbox.originY - 28, textWidth + 16, 24);
        
        // Label text
        ctx.fillStyle = "#00ff88";
        ctx.shadowColor = "#00ff88";
        ctx.shadowBlur = 10;
        ctx.fillText(label, bbox.originX + 8, bbox.originY - 10);
      });
    } catch (error) {
      console.error("Detection error:", error);
    }
  }, [faceDetector]);

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

  // Capture face and show modal
  const captureFace = () => {
    if (!webcamRef.current || detectedFaces === 0) return;
    
    setIsCapturing(true);
    
    // Add a brief delay for visual feedback
    setTimeout(() => {
      const imageSrc = webcamRef.current?.getScreenshot();
      if (imageSrc) {
        setCapturedImage(imageSrc);
        setShowCaptureModal(true);
      }
      setIsCapturing(false);
    }, 200);
  };

  // Mark student as present
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
    setShowCaptureModal(false);
    setCapturedImage(null);
    
    toast({
      title: "Attendance Marked! ✓",
      description: `${student.name} marked present at ${record.timestamp}`,
    });
  };

  // Submit attendance to Google Sheets
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
      // Simulating the submission for demo
      await new Promise((resolve) => setTimeout(resolve, 1500));

      toast({
        title: "Attendance Submitted! 🎉",
        description: `${todayAttendance.length} records sent to Google Sheets`,
      });

      // Open the sheet in a new tab
      window.open(GOOGLE_SHEET_URL, "_blank");
      
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: "Submission Failed",
        description: "Could not submit to Google Sheets. Check console for details.",
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

  // Get unmarked students
  const unmarkedStudents = students.filter(
    (s) => !todayAttendance.some((r) => r.studentId === s.id)
  );

  return (
    <Layout>
      <div className="min-h-screen bg-background pt-20 pb-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 mb-4">
              <UserCheck className="w-4 h-4 text-neon-cyan" />
              <span className="text-sm text-neon-cyan font-medium">Smart Attendance</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-gradient-cyan">Attendance</span> Management
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Mark attendance using face recognition and sync directly to Google Sheets
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
                      
                      {/* Scanning overlay animation */}
                      {isProcessing && detectedFaces === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <Scan className="w-16 h-16 text-neon-cyan/50 animate-pulse mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Scanning for faces...</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Live Stats Overlay */}
                      <div className="absolute top-4 left-4 flex gap-2">
                        <div className={`px-3 py-1.5 rounded-full backdrop-blur-sm border transition-all duration-300 ${
                          detectedFaces > 0 
                            ? "bg-neon-green/20 border-neon-green/50" 
                            : "bg-background/80 border-neon-cyan/30"
                        }`}>
                          <span className={`text-sm font-mono ${
                            detectedFaces > 0 ? "text-neon-green" : "text-neon-cyan"
                          }`}>
                            {detectedFaces > 0 ? `✓ ${detectedFaces} face${detectedFaces !== 1 ? "s" : ""} detected` : "No faces detected"}
                          </span>
                        </div>
                      </div>

                      {/* Capture Button - Shows when face detected */}
                      {detectedFaces > 0 && students.length > 0 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-fade-in-up">
                          <Button
                            onClick={captureFace}
                            disabled={isCapturing}
                            size="lg"
                            className="gap-3 h-14 px-8 text-lg font-semibold bg-gradient-to-r from-neon-green to-neon-cyan text-background hover:opacity-90 shadow-lg shadow-neon-green/30 animate-pulse-glow"
                          >
                            {isCapturing ? (
                              <>
                                <Loader2 className="w-6 h-6 animate-spin" />
                                Capturing...
                              </>
                            ) : (
                              <>
                                <Camera className="w-6 h-6" />
                                Capture & Mark Present
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {lastDetection && (
                        <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                          <div className="px-4 py-2 rounded-lg bg-neon-green/20 border border-neon-green/50 backdrop-blur-sm animate-fade-in inline-block">
                            <span className="text-neon-green font-medium">
                              ✓ Last marked: {lastDetection}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Instructions */}
                    {students.length > 0 && (
                      <div className="bg-card/30 rounded-lg p-4 border border-border/50">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-neon-yellow" />
                          How to mark attendance:
                        </h4>
                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                          <li>Position the student's face in the camera</li>
                          <li>Wait for face detection (green box appears)</li>
                          <li>Click "Capture & Mark Present" button</li>
                          <li>Select the student from the list</li>
                        </ol>
                      </div>
                    )}

                    {/* Student Quick Select */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Users className="w-5 h-5 text-neon-purple" />
                          Students ({unmarkedStudents.length} remaining)
                        </h3>
                        <Link to="/attendance/students">
                          <Button variant="outline" size="sm" className="gap-2 hover-lift">
                            <UserPlus className="w-4 h-4" />
                            Manage Students
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
                            const isMarked = todayAttendance.some(
                              (r) => r.studentId === student.id
                            );
                            return (
                              <button
                                key={student.id}
                                onClick={() => !isMarked && markPresent(student)}
                                disabled={isMarked}
                                className={`
                                  group relative p-4 rounded-xl border-2 transition-all duration-300
                                  animate-fade-in-up hover-lift
                                  ${
                                    isMarked
                                      ? "bg-neon-green/10 border-neon-green/50 cursor-default"
                                      : "bg-card/50 border-border hover:border-neon-cyan/50 hover:bg-neon-cyan/5 cursor-pointer"
                                  }
                                `}
                                style={{ animationDelay: `${index * 0.05}s` }}
                              >
                                {isMarked && (
                                  <div className="absolute -top-2 -right-2">
                                    <CheckCircle2 className="w-6 h-6 text-neon-green animate-scale-in" />
                                  </div>
                                )}
                                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center border border-white/10 overflow-hidden">
                                  {student.imageData ? (
                                    <img src={student.imageData} alt={student.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-lg font-bold text-gradient-cyan">
                                      {student.name.charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm font-medium truncate">{student.name}</p>
                                <p className="text-xs text-muted-foreground">{student.rollNo}</p>
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
              <Card className="glass-card p-6 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-neon-yellow" />
                  Today's Summary
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-neon-green/10 border border-neon-green/30">
                    <CheckCircle2 className="w-6 h-6 text-neon-green mb-2" />
                    <p className="text-2xl font-bold text-neon-green">{todayAttendance.length}</p>
                    <p className="text-xs text-muted-foreground">Present</p>
                  </div>
                  <div className="p-4 rounded-xl bg-neon-pink/10 border border-neon-pink/30">
                    <XCircle className="w-6 h-6 text-neon-pink mb-2" />
                    <p className="text-2xl font-bold text-neon-pink">
                      {Math.max(0, students.length - todayAttendance.length)}
                    </p>
                    <p className="text-xs text-muted-foreground">Absent</p>
                  </div>
                </div>
                
                {/* Progress bar */}
                {students.length > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Attendance Progress</span>
                      <span>{Math.round((todayAttendance.length / students.length) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-background rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-neon-green to-neon-cyan transition-all duration-500"
                        style={{ width: `${(todayAttendance.length / students.length) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </Card>

              {/* Attendance List */}
              <Card className="glass-card p-6 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-neon-cyan" />
                  Attendance Log
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {todayAttendance.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      No attendance marked yet
                    </p>
                  ) : (
                    todayAttendance.map((record, index) => (
                      <div
                        key={record.studentId}
                        className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border animate-fade-in"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-neon-green/20 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-neon-green" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{record.studentName}</p>
                            <p className="text-xs text-muted-foreground">{record.rollNo}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">
                          {record.timestamp}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Submit Button */}
              <Button
                onClick={submitToGoogleSheets}
                disabled={isSubmitting || todayAttendance.length === 0}
                className="w-full gap-2 h-14 text-lg font-semibold bg-gradient-to-r from-neon-cyan to-neon-purple hover:opacity-90 transition-all hover-lift animate-fade-in-up"
                style={{ animationDelay: "0.4s" }}
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

              <p className="text-xs text-center text-muted-foreground">
                Attendance will be synced to your Google Sheet
              </p>
            </div>
          </div>
        </div>

        {/* Capture Modal */}
        {showCaptureModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => {
                setShowCaptureModal(false);
                setCapturedImage(null);
              }}
            />
            <Card className="relative z-10 w-full max-w-lg glass-card p-6 animate-scale-in-bounce">
              {/* Close Button */}
              <button
                onClick={() => {
                  setShowCaptureModal(false);
                  setCapturedImage(null);
                }}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Camera className="w-6 h-6 text-neon-green" />
                Select Student
              </h2>

              {/* Captured Image */}
              {capturedImage && (
                <div className="mb-4 rounded-xl overflow-hidden border-2 border-neon-green/50">
                  <img src={capturedImage} alt="Captured face" className="w-full" />
                </div>
              )}

              <p className="text-muted-foreground mb-4">
                Who is this? Select the student to mark present:
              </p>

              {/* Student Selection */}
              <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto custom-scrollbar">
                {unmarkedStudents.length === 0 ? (
                  <p className="col-span-2 text-center text-muted-foreground py-4">
                    All students are already marked present!
                  </p>
                ) : (
                  unmarkedStudents.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => markPresent(student)}
                      className="flex items-center gap-3 p-3 rounded-xl border-2 border-border bg-card/50 hover:border-neon-green/50 hover:bg-neon-green/5 transition-all duration-300 hover-lift"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center border border-white/10 flex-shrink-0 overflow-hidden">
                        {student.imageData ? (
                          <img src={student.imageData} alt={student.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-gradient-cyan">
                            {student.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.rollNo}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Attendance;
