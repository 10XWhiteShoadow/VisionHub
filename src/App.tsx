import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import Index from "./pages/Index";
import FaceDetection from "./pages/FaceDetection";
import HandGesture from "./pages/HandGesture";
import ObjectDetection from "./pages/ObjectDetection";
import PoseEstimation from "./pages/PoseEstimation";
import OCR from "./pages/OCR";
import Attendance from "./pages/Attendance";
import StudentManagement from "./pages/StudentManagement";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/face-detection" element={<FaceDetection />} />
              <Route path="/hand-gesture" element={<HandGesture />} />
              <Route path="/object-detection" element={<ObjectDetection />} />
              <Route path="/pose-estimation" element={<PoseEstimation />} />
              <Route path="/ocr" element={<OCR />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/attendance/students" element={<StudentManagement />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
