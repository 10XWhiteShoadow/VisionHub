import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import Index from "./pages/Index";
import FaceDetection from "./pages/FaceDetection";
import HandGesture from "./pages/HandGesture";
import ObjectDetection from "./pages/ObjectDetection";
import PoseEstimation from "./pages/PoseEstimation";
import OCR from "./pages/OCR";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/**
 * VisionHub - Computer Vision Demo Platform
 * 
 * Features:
 * - Face Detection & Emotion Recognition (MediaPipe)
 * - Hand Gesture Recognition with mini-game (MediaPipe)
 * - Object Detection & Scavenger Hunt (COCO-SSD)
 * - Pose Estimation & Exercise Counter (MediaPipe)
 * - OCR & Translation (Tesseract.js)
 * 
 * All processing happens client-side for privacy.
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
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
          {/* Catch-all 404 route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
