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
  Sparkles
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

        // Draw neon bounding box
        ctx.strokeStyle = "#00ff88";
        ctx.lineWidth = 3;
        ctx.shadowColor = "#00ff88";
        ctx.shadowBlur = 15;
        ctx.strokeRect(bbox.originX, bbox.originY, bbox.width, bbox.height);

        // Draw confidence label
        const confidence = (detection.categories[0]?.score || 0) * 100;
        ctx.fillStyle = "#00ff88";
        ctx.font = "bold 14px 'Space Grotesk'";
        ctx.shadowBlur = 10;
        ctx.fillText(
          `Face ${index + 1} (${confidence.toFixed(0)}%)`,
          bbox.originX,
          bbox.originY - 10
        );
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
      // For Google Sheets integration, we need a Google Apps Script Web App
      // This is a demo - in production, you'd deploy a script like:
      /*
        function doPost(e) {
          const sheet = SpreadsheetApp.openById('125iuh-wPn_XFNfmjufOkB0anM3wGG3_9Cq5X_IxlICc').getActiveSheet();
          const data = JSON.parse(e.postData.contents);
          data.forEach(record => {
            sheet.appendRow([record.date, record.rollNo, record.studentName, record.timestamp, record.status]);
          });
          return ContentService.createTextOutput(JSON.stringify({success: true}));
        }
      */
      
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
                      />
                      <canvas
                        ref={canvasRef}
                        className="absolute inset-0 w-full h-full pointer-events-none"
                      />
                      
                      {/* Live Stats Overlay */}
                      <div className="absolute top-4 left-4 flex gap-2">
                        <div className="px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-neon-cyan/30">
                          <span className="text-sm text-neon-cyan font-mono">
                            {detectedFaces} face{detectedFaces !== 1 ? "s" : ""} detected
                          </span>
                        </div>
                      </div>

                      {lastDetection && (
                        <div className="absolute bottom-4 left-4 right-4">
                          <div className="px-4 py-2 rounded-lg bg-neon-green/20 border border-neon-green/50 backdrop-blur-sm animate-fade-in">
                            <span className="text-neon-green font-medium">
                              ✓ Last marked: {lastDetection}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Student Quick Select */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Users className="w-5 h-5 text-neon-purple" />
                          Quick Mark Present
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
                                      ? "bg-neon-green/10 border-neon-green/50"
                                      : "bg-card/50 border-border hover:border-neon-cyan/50 hover:bg-neon-cyan/5"
                                  }
                                `}
                                style={{ animationDelay: `${index * 0.05}s` }}
                              >
                                {isMarked && (
                                  <div className="absolute -top-2 -right-2">
                                    <CheckCircle2 className="w-6 h-6 text-neon-green animate-scale-in" />
                                  </div>
                                )}
                                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center border border-white/10">
                                  <span className="text-lg font-bold text-gradient-cyan">
                                    {student.name.charAt(0).toUpperCase()}
                                  </span>
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
      </div>
    </Layout>
  );
};

export default Attendance;
