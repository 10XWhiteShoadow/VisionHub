import { ReactNode } from "react";
import { 
  Brain, 
  Cpu, 
  Layers, 
  ArrowRight, 
  Lightbulb, 
  Code2, 
  ExternalLink,
  Sparkles,
  Eye,
  Grid3X3,
  Boxes,
  GitBranch,
  Workflow,
  Zap,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StepCardProps {
  step: number;
  title: string;
  description: string;
  icon: ReactNode;
  color: "cyan" | "purple" | "pink" | "green" | "orange";
  isLast?: boolean;
}

const colorClasses = {
  cyan: {
    bg: "bg-neon-cyan/10",
    bgSolid: "bg-neon-cyan",
    border: "border-neon-cyan/30",
    borderHover: "hover:border-neon-cyan/60",
    text: "text-neon-cyan",
    glow: "shadow-[0_0_30px_-5px_hsl(var(--neon-cyan)/0.3)]",
    gradient: "from-neon-cyan/20 to-transparent",
  },
  purple: {
    bg: "bg-neon-purple/10",
    bgSolid: "bg-neon-purple",
    border: "border-neon-purple/30",
    borderHover: "hover:border-neon-purple/60",
    text: "text-neon-purple",
    glow: "shadow-[0_0_30px_-5px_hsl(var(--neon-purple)/0.3)]",
    gradient: "from-neon-purple/20 to-transparent",
  },
  pink: {
    bg: "bg-neon-pink/10",
    bgSolid: "bg-neon-pink",
    border: "border-neon-pink/30",
    borderHover: "hover:border-neon-pink/60",
    text: "text-neon-pink",
    glow: "shadow-[0_0_30px_-5px_hsl(var(--neon-pink)/0.3)]",
    gradient: "from-neon-pink/20 to-transparent",
  },
  green: {
    bg: "bg-neon-green/10",
    bgSolid: "bg-neon-green",
    border: "border-neon-green/30",
    borderHover: "hover:border-neon-green/60",
    text: "text-neon-green",
    glow: "shadow-[0_0_30px_-5px_hsl(var(--neon-green)/0.3)]",
    gradient: "from-neon-green/20 to-transparent",
  },
  orange: {
    bg: "bg-neon-orange/10",
    bgSolid: "bg-neon-orange",
    border: "border-neon-orange/30",
    borderHover: "hover:border-neon-orange/60",
    text: "text-neon-orange",
    glow: "shadow-[0_0_30px_-5px_hsl(var(--neon-orange)/0.3)]",
    gradient: "from-neon-orange/20 to-transparent",
  },
};

function StepCard({ step, title, description, icon, color, isLast }: StepCardProps) {
  const colors = colorClasses[color];
  return (
    <div className="relative flex gap-4 group">
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <div className={cn(
          "relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
          "bg-gradient-to-br from-background to-card border-2",
          colors.border,
          colors.borderHover,
          "group-hover:scale-110",
          colors.glow
        )}>
          <div className={cn("transition-transform duration-300 group-hover:scale-110", colors.text)}>
            {icon}
          </div>
        </div>
        {!isLast && (
          <div className={cn(
            "w-0.5 h-full min-h-[60px] transition-all duration-500",
            "bg-gradient-to-b",
            colors.gradient
          )} />
        )}
      </div>

      {/* Content card */}
      <div className={cn(
        "flex-1 p-5 rounded-2xl border backdrop-blur-sm transition-all duration-300",
        "bg-gradient-to-br from-card/80 to-card/40",
        colors.border,
        colors.borderHover,
        "group-hover:translate-x-1",
        "mb-4"
      )}>
        <div className="flex items-center gap-3 mb-2">
          <span className={cn(
            "text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase",
            colors.bg, colors.text
          )}>
            Step {step}
          </span>
        </div>
        <h4 className="font-bold text-lg mb-2 group-hover:text-foreground transition-colors">{title}</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

interface ArchitectureLayerProps {
  layer: { name: string; description: string };
  index: number;
  total: number;
  color: "cyan" | "purple" | "pink" | "green" | "orange";
}

function ArchitectureLayer({ layer, index, total, color }: ArchitectureLayerProps) {
  const colors = colorClasses[color];
  const widthPercent = 100 - (index * (40 / total));
  
  return (
    <div className="flex flex-col items-center animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
      <div 
        className={cn(
          "relative p-4 rounded-xl border backdrop-blur-sm transition-all duration-300",
          "hover:scale-[1.02] cursor-default group",
          colors.bg, colors.border, colors.borderHover
        )}
        style={{ width: `${widthPercent}%` }}
      >
        {/* Glow effect */}
        <div className={cn(
          "absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl",
          colors.bg
        )} />
        
        <div className="text-center">
          <p className={cn("font-semibold text-sm", colors.text)}>{layer.name}</p>
          <p className="text-xs text-muted-foreground mt-1">{layer.description}</p>
        </div>
      </div>
      
      {index < total - 1 && (
        <div className="py-2">
          <ChevronRight className={cn("w-5 h-5 rotate-90 animate-pulse", colors.text)} />
        </div>
      )}
    </div>
  );
}

interface ModelLearnContentProps {
  type: "face" | "hand" | "object" | "pose" | "ocr" | "background" | "attendance";
}

export function ModelLearnContent({ type }: ModelLearnContentProps) {
  const content = getContentByType(type);
  
  return (
    <div className="space-y-10 animate-fade-in">
      {/* Header with animated background */}
      <div className="relative text-center space-y-4 py-8">
        {/* Background glow */}
        <div className={cn(
          "absolute inset-0 rounded-3xl opacity-30 blur-3xl -z-10",
          colorClasses[content.color].bg
        )} />
        
        <div className={cn(
          "inline-flex items-center gap-2 px-5 py-2.5 rounded-full",
          "bg-card/80 backdrop-blur-sm border",
          colorClasses[content.color].border
        )}>
          <Sparkles className={cn("w-4 h-4 animate-pulse", colorClasses[content.color].text)} />
          <span className="text-sm font-semibold tracking-wide">Deep Dive</span>
        </div>
        
        <h2 className="text-3xl md:text-4xl font-black">
          <span className="text-gradient-animate">{content.title}</span>
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
          {content.subtitle}
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-10">
        {/* Left: How the Model Works - Timeline */}
        <div className="space-y-6">
          <div className={cn(
            "inline-flex items-center gap-3 px-4 py-2 rounded-xl",
            colorClasses[content.color].bg,
            "border",
            colorClasses[content.color].border
          )}>
            <Brain className={cn("w-5 h-5", colorClasses[content.color].text)} />
            <h3 className="text-lg font-bold">Processing Pipeline</h3>
          </div>
          
          <div className="pl-2">
            {content.steps.map((step, index) => (
              <StepCard
                key={index}
                step={index + 1}
                title={step.title}
                description={step.description}
                icon={step.icon}
                color={content.color}
                isLast={index === content.steps.length - 1}
              />
            ))}
          </div>
        </div>

        {/* Right: Architecture & Info */}
        <div className="space-y-6">
          {/* Architecture Diagram */}
          <div className={cn(
            "p-6 rounded-2xl border backdrop-blur-sm",
            "bg-gradient-to-br from-card/80 to-card/40",
            colorClasses[content.color].border
          )}>
            <div className="flex items-center gap-3 mb-6">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                colorClasses[content.color].bg
              )}>
                <Layers className={cn("w-5 h-5", colorClasses[content.color].text)} />
              </div>
              <h3 className="text-lg font-bold">Neural Architecture</h3>
            </div>
            
            <div className="space-y-2">
              {content.architecture.map((layer, index) => (
                <ArchitectureLayer
                  key={index}
                  layer={layer}
                  index={index}
                  total={content.architecture.length}
                  color={content.color}
                />
              ))}
            </div>
          </div>

          {/* Tech Stack */}
          <div className={cn(
            "p-5 rounded-2xl border backdrop-blur-sm",
            "bg-gradient-to-br from-card/80 to-card/40",
            colorClasses[content.color].border
          )}>
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                colorClasses[content.color].bg
              )}>
                <Code2 className={cn("w-4 h-4", colorClasses[content.color].text)} />
              </div>
              <h4 className="font-bold">Tech Stack</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {content.techStack.map((tech, index) => (
                <span
                  key={index}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
                    "bg-background/60 border border-border/50",
                    "hover:border-primary/50 hover:scale-105 cursor-default"
                  )}
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Key Concepts */}
          <div className={cn(
            "p-5 rounded-2xl border backdrop-blur-sm",
            "bg-gradient-to-br from-card/80 to-card/40",
            colorClasses[content.color].border
          )}>
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                colorClasses[content.color].bg
              )}>
                <Lightbulb className={cn("w-4 h-4", colorClasses[content.color].text)} />
              </div>
              <h4 className="font-bold">Key Insights</h4>
            </div>
            <ul className="space-y-3">
              {content.keyConcepts.map((concept, index) => (
                <li key={index} className="flex items-start gap-3 group">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-300",
                    colorClasses[content.color].bg,
                    "group-hover:scale-110"
                  )}>
                    <Zap className={cn("w-3 h-3", colorClasses[content.color].text)} />
                  </div>
                  <span className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
                    {concept}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Learn More */}
          {content.resources && (
            <div className="p-5 rounded-2xl bg-muted/20 border border-border/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </div>
                <h4 className="font-bold">Resources</h4>
              </div>
              <ul className="space-y-2">
                {content.resources.map((resource, index) => (
                  <li key={index}>
                    <a 
                      href={resource.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={cn(
                        "flex items-center gap-2 text-sm transition-all duration-300",
                        "text-muted-foreground hover:text-primary",
                        "group/link"
                      )}
                    >
                      <ArrowRight className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
                      {resource.name}
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ContentData {
  title: string;
  subtitle: string;
  color: "cyan" | "purple" | "pink" | "green" | "orange";
  steps: { title: string; description: string; icon: ReactNode }[];
  architecture: { name: string; description: string }[];
  techStack: string[];
  keyConcepts: string[];
  resources?: { name: string; url: string }[];
}

function getContentByType(type: ModelLearnContentProps["type"]): ContentData {
  switch (type) {
    case "face":
      return {
        title: "Face Detection & Emotion Recognition",
        subtitle: "Learn how neural networks detect faces and classify emotions from facial expressions in real-time.",
        color: "cyan",
        steps: [
          {
            title: "Image Input",
            description: "The webcam captures video frames which are converted to image tensors for processing.",
            icon: <Eye className="w-5 h-5" />,
          },
          {
            title: "Face Detection",
            description: "TinyFaceDetector CNN scans the image with sliding windows to locate face bounding boxes.",
            icon: <Grid3X3 className="w-5 h-5" />,
          },
          {
            title: "Landmark Extraction",
            description: "68 facial landmarks (eyes, nose, mouth corners) are detected to map face geometry.",
            icon: <Boxes className="w-5 h-5" />,
          },
          {
            title: "Expression Analysis",
            description: "A classifier network analyzes landmark positions to determine emotion probabilities.",
            icon: <Brain className="w-5 h-5" />,
          },
        ],
        architecture: [
          { name: "Input Layer", description: "320x320 RGB Image" },
          { name: "TinyFaceDetector", description: "Lightweight CNN for detection" },
          { name: "FaceLandmark68Net", description: "68 key point localization" },
          { name: "FaceExpressionNet", description: "7-class emotion classifier" },
          { name: "Output", description: "Emotions + Confidence scores" },
        ],
        techStack: ["face-api.js", "TensorFlow.js", "WebGL", "Canvas API"],
        keyConcepts: [
          "Convolutional Neural Networks (CNNs) learn spatial features hierarchically",
          "Non-Maximum Suppression removes overlapping detection boxes",
          "Facial Action Coding System (FACS) maps muscle movements to emotions",
          "Transfer learning allows pre-trained models to work in browsers",
        ],
        resources: [
          { name: "face-api.js Documentation", url: "https://github.com/vladmandic/face-api" },
          { name: "Understanding CNNs", url: "https://cs231n.github.io/convolutional-networks/" },
        ],
      };

    case "hand":
      return {
        title: "Hand Gesture Recognition",
        subtitle: "Discover how MediaPipe tracks 21 hand landmarks to recognize gestures in real-time.",
        color: "purple",
        steps: [
          {
            title: "Palm Detection",
            description: "BlazePalm detector locates hands in the frame using a single-shot detector architecture.",
            icon: <Eye className="w-5 h-5" />,
          },
          {
            title: "Hand Crop & Align",
            description: "Detected palm region is cropped and aligned for consistent landmark detection.",
            icon: <Grid3X3 className="w-5 h-5" />,
          },
          {
            title: "Landmark Detection",
            description: "21 3D landmarks are predicted: wrist, thumb (4), and each finger (4 joints each).",
            icon: <Boxes className="w-5 h-5" />,
          },
          {
            title: "Gesture Classification",
            description: "Finger positions relative to palm determine gestures like pointing, peace, fist, etc.",
            icon: <GitBranch className="w-5 h-5" />,
          },
        ],
        architecture: [
          { name: "Input Frame", description: "Video frame from webcam" },
          { name: "BlazePalm Detector", description: "SSD-based palm localization" },
          { name: "Hand ROI Extraction", description: "256x256 cropped region" },
          { name: "HandLandmarker", description: "21 3D keypoint regression" },
          { name: "Output", description: "Landmark coordinates + handedness" },
        ],
        techStack: ["MediaPipe", "TensorFlow Lite", "WebGPU/WebGL", "WASM"],
        keyConcepts: [
          "Two-stage detection: fast palm detection → refined landmark estimation",
          "3D coordinates allow depth-aware gesture understanding",
          "Finger extension is measured by comparing tip vs MCP joint positions",
          "Running Mode: VIDEO enables temporal smoothing between frames",
        ],
        resources: [
          { name: "MediaPipe Hands", url: "https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker" },
          { name: "BlazePalm Paper", url: "https://arxiv.org/abs/2006.10214" },
        ],
      };

    case "object":
      return {
        title: "Object Detection with COCO-SSD",
        subtitle: "Learn how Single Shot Detectors identify and locate 80 object classes in real-time.",
        color: "pink",
        steps: [
          {
            title: "Feature Extraction",
            description: "MobileNetV2 backbone extracts hierarchical features from the input image.",
            icon: <Layers className="w-5 h-5" />,
          },
          {
            title: "Multi-Scale Detection",
            description: "SSD predicts boxes at multiple scales using feature maps of different resolutions.",
            icon: <Grid3X3 className="w-5 h-5" />,
          },
          {
            title: "Class Prediction",
            description: "Each anchor box predicts class probabilities for 80 COCO categories.",
            icon: <Brain className="w-5 h-5" />,
          },
          {
            title: "Non-Max Suppression",
            description: "Overlapping boxes are filtered, keeping only the highest confidence detections.",
            icon: <Boxes className="w-5 h-5" />,
          },
        ],
        architecture: [
          { name: "Input Image", description: "300x300 normalized RGB" },
          { name: "MobileNetV2", description: "Efficient feature extractor" },
          { name: "SSD Feature Maps", description: "Multi-resolution predictions" },
          { name: "Box Regression + Classification", description: "BBox + 80 class scores" },
          { name: "NMS Output", description: "Filtered detections" },
        ],
        techStack: ["TensorFlow.js", "COCO-SSD", "WebGL Backend", "Canvas API"],
        keyConcepts: [
          "Single Shot Detection processes the entire image in one forward pass",
          "Anchor boxes provide prior shapes for common object aspect ratios",
          "COCO dataset contains 80 everyday object categories",
          "MobileNet uses depthwise separable convolutions for efficiency",
        ],
        resources: [
          { name: "TensorFlow.js COCO-SSD", url: "https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd" },
          { name: "SSD Architecture Paper", url: "https://arxiv.org/abs/1512.02325" },
        ],
      };

    case "pose":
      return {
        title: "Pose Estimation & Exercise Counter",
        subtitle: "Understand how MediaPipe Pose tracks 33 body landmarks for movement analysis.",
        color: "green",
        steps: [
          {
            title: "Person Detection",
            description: "Initial detector locates the person's bounding box in the frame.",
            icon: <Eye className="w-5 h-5" />,
          },
          {
            title: "Pose Landmark Detection",
            description: "33 body keypoints are detected: face, shoulders, elbows, wrists, hips, knees, ankles.",
            icon: <Boxes className="w-5 h-5" />,
          },
          {
            title: "Joint Angle Calculation",
            description: "Angles between connected landmarks are computed using trigonometry (atan2).",
            icon: <Workflow className="w-5 h-5" />,
          },
          {
            title: "Rep Counting Logic",
            description: "State machine tracks up/down positions based on joint angles to count reps.",
            icon: <GitBranch className="w-5 h-5" />,
          },
        ],
        architecture: [
          { name: "Input Frame", description: "Webcam video frame" },
          { name: "Person Detector", description: "BlazePose detector" },
          { name: "Pose Landmarker", description: "33 3D keypoint model" },
          { name: "Angle Computation", description: "Geometric calculations" },
          { name: "Output", description: "Skeleton + rep count" },
        ],
        techStack: ["MediaPipe Pose", "TensorFlow Lite", "WebGPU", "JavaScript Math"],
        keyConcepts: [
          "33 landmarks cover the full body for comprehensive pose estimation",
          "Joint angles are calculated: angle = atan2(c.y-b.y, c.x-b.x) - atan2(a.y-b.y, a.x-b.x)",
          "State machine: DOWN → UP transition = 1 rep completed",
          "Visibility scores help handle partial occlusions",
        ],
        resources: [
          { name: "MediaPipe Pose", url: "https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker" },
          { name: "BlazePose Paper", url: "https://arxiv.org/abs/2006.10204" },
        ],
      };

    case "ocr":
      return {
        title: "OCR & AI-Enhanced Text Recognition",
        subtitle: "Learn how Tesseract.js extracts text from images with AI-powered correction.",
        color: "orange",
        steps: [
          {
            title: "Image Preprocessing",
            description: "Contrast enhancement, grayscale conversion, and sharpening improve text clarity.",
            icon: <Eye className="w-5 h-5" />,
          },
          {
            title: "Text Detection",
            description: "LSTM-based neural network segments and recognizes text line by line.",
            icon: <Grid3X3 className="w-5 h-5" />,
          },
          {
            title: "Character Recognition",
            description: "Each character is classified using trained pattern matching and language models.",
            icon: <Brain className="w-5 h-5" />,
          },
          {
            title: "AI Enhancement",
            description: "Gemini AI corrects spelling mistakes and provides accurate translations.",
            icon: <Sparkles className="w-5 h-5" />,
          },
        ],
        architecture: [
          { name: "Input Image", description: "Captured frame from webcam" },
          { name: "Preprocessing", description: "Scale, contrast, sharpen" },
          { name: "Tesseract LSTM", description: "Character segmentation" },
          { name: "Gemini AI", description: "Error correction & translation" },
          { name: "Output", description: "Clean text + translations" },
        ],
        techStack: ["Tesseract.js", "Gemini AI", "Canvas API", "Edge Functions"],
        keyConcepts: [
          "LSTM networks handle variable-length sequences for text recognition",
          "Image preprocessing (3x scale, contrast) significantly improves accuracy",
          "AI post-processing catches errors that raw OCR misses",
          "Language-specific models improve recognition for non-English text",
        ],
        resources: [
          { name: "Tesseract.js Documentation", url: "https://tesseract.projectnaptha.com/" },
          { name: "OCR Best Practices", url: "https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html" },
        ],
      };

    case "background":
      return {
        title: "AI Background Removal",
        subtitle: "Explore how transformer models segment foreground subjects from backgrounds.",
        color: "purple",
        steps: [
          {
            title: "Image Encoding",
            description: "The image is processed through a vision transformer to extract features.",
            icon: <Eye className="w-5 h-5" />,
          },
          {
            title: "Segmentation",
            description: "The model predicts a mask distinguishing foreground from background pixels.",
            icon: <Grid3X3 className="w-5 h-5" />,
          },
          {
            title: "Mask Refinement",
            description: "Edge detection and smoothing create clean, natural-looking cutouts.",
            icon: <Boxes className="w-5 h-5" />,
          },
          {
            title: "Compositing",
            description: "The subject is combined with new backgrounds or transparency.",
            icon: <Layers className="w-5 h-5" />,
          },
        ],
        architecture: [
          { name: "Input Image", description: "User uploaded or captured" },
          { name: "Vision Transformer", description: "Feature extraction" },
          { name: "Segmentation Head", description: "Per-pixel classification" },
          { name: "Mask Post-Processing", description: "Refinement & smoothing" },
          { name: "Output", description: "Transparent PNG" },
        ],
        techStack: ["Transformers.js", "RMBG-1.4", "Canvas API", "WebGPU"],
        keyConcepts: [
          "Vision Transformers (ViT) process images as sequences of patches",
          "Self-attention captures global context for better segmentation",
          "Alpha matting handles semi-transparent edges like hair",
          "WebGPU acceleration enables real-time processing in browsers",
        ],
        resources: [
          { name: "Transformers.js", url: "https://huggingface.co/docs/transformers.js" },
          { name: "RMBG Model", url: "https://huggingface.co/briaai/RMBG-1.4" },
        ],
      };

    case "attendance":
      return {
        title: "Face-Based Attendance System",
        subtitle: "Discover how facial recognition automates attendance tracking with voice feedback.",
        color: "green",
        steps: [
          {
            title: "Face Detection",
            description: "MediaPipe BlazeFace detects faces in real-time from the webcam feed.",
            icon: <Eye className="w-5 h-5" />,
          },
          {
            title: "Face Region Extraction",
            description: "Detected face regions are cropped and normalized for comparison.",
            icon: <Grid3X3 className="w-5 h-5" />,
          },
          {
            title: "Histogram Matching",
            description: "Color histograms of detected faces are compared against registered student photos.",
            icon: <Brain className="w-5 h-5" />,
          },
          {
            title: "Auto-Mark & Announce",
            description: "When confidence exceeds threshold, attendance is marked and name is announced.",
            icon: <Sparkles className="w-5 h-5" />,
          },
        ],
        architecture: [
          { name: "Webcam Input", description: "Live video stream" },
          { name: "BlazeFace Detector", description: "GPU-accelerated face detection" },
          { name: "Face ROI Extraction", description: "32x32 normalized regions" },
          { name: "Histogram Correlation", description: "Color-based similarity scoring" },
          { name: "Output", description: "Matched student + voice announcement" },
        ],
        techStack: ["MediaPipe", "Web Speech API", "Supabase", "Canvas API"],
        keyConcepts: [
          "Histogram correlation compares color distributions (0-1 similarity score)",
          "Stabilization prevents flickering by requiring consistent matches over frames",
          "Cooldown period prevents duplicate markings for the same student",
          "Web Speech API enables text-to-speech announcements",
        ],
        resources: [
          { name: "MediaPipe Face Detection", url: "https://ai.google.dev/edge/mediapipe/solutions/vision/face_detector" },
          { name: "Web Speech API", url: "https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API" },
        ],
      };
  }
}
