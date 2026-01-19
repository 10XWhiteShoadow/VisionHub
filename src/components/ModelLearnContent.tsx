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
  Workflow
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StepCardProps {
  step: number;
  title: string;
  description: string;
  icon: ReactNode;
  color: "cyan" | "purple" | "pink" | "green" | "orange";
}

const colorClasses = {
  cyan: {
    bg: "bg-neon-cyan/10",
    border: "border-neon-cyan/30",
    text: "text-neon-cyan",
    glow: "shadow-neon-cyan/20",
  },
  purple: {
    bg: "bg-neon-purple/10",
    border: "border-neon-purple/30",
    text: "text-neon-purple",
    glow: "shadow-neon-purple/20",
  },
  pink: {
    bg: "bg-neon-pink/10",
    border: "border-neon-pink/30",
    text: "text-neon-pink",
    glow: "shadow-neon-pink/20",
  },
  green: {
    bg: "bg-neon-green/10",
    border: "border-neon-green/30",
    text: "text-neon-green",
    glow: "shadow-neon-green/20",
  },
  orange: {
    bg: "bg-neon-orange/10",
    border: "border-neon-orange/30",
    text: "text-neon-orange",
    glow: "shadow-neon-orange/20",
  },
};

function StepCard({ step, title, description, icon, color }: StepCardProps) {
  const colors = colorClasses[color];
  return (
    <div className={cn(
      "relative p-4 rounded-xl border transition-all hover:scale-[1.02]",
      colors.bg, colors.border, `hover:shadow-lg ${colors.glow}`
    )}>
      <div className="flex items-start gap-4">
        <div className={cn(
          "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
          colors.bg, colors.text
        )}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", colors.bg, colors.text)}>
              Step {step}
            </span>
          </div>
          <h4 className="font-semibold mb-1">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

interface ArchitectureDiagramProps {
  layers: { name: string; description: string }[];
  color: "cyan" | "purple" | "pink" | "green" | "orange";
}

function ArchitectureDiagram({ layers, color }: ArchitectureDiagramProps) {
  const colors = colorClasses[color];
  return (
    <div className="space-y-2">
      {layers.map((layer, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className={cn(
            "flex-1 p-3 rounded-lg border text-center transition-all hover:scale-[1.02]",
            colors.bg, colors.border
          )}>
            <p className="font-medium text-sm">{layer.name}</p>
            <p className="text-xs text-muted-foreground">{layer.description}</p>
          </div>
          {index < layers.length - 1 && (
            <ArrowRight className={cn("w-4 h-4 rotate-90 flex-shrink-0", colors.text)} />
          )}
        </div>
      ))}
    </div>
  );
}

interface ModelLearnContentProps {
  type: "face" | "hand" | "object" | "pose" | "ocr" | "background";
}

export function ModelLearnContent({ type }: ModelLearnContentProps) {
  const content = getContentByType(type);
  
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-full",
          colorClasses[content.color].bg,
          colorClasses[content.color].border,
          "border"
        )}>
          <Sparkles className={cn("w-4 h-4", colorClasses[content.color].text)} />
          <span className="text-sm font-medium">Learn How It Works</span>
        </div>
        <h2 className="text-2xl font-bold">{content.title}</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">{content.subtitle}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Left: How the Model Works */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain className={cn("w-5 h-5", colorClasses[content.color].text)} />
            <h3 className="text-lg font-semibold">How It Works</h3>
          </div>
          <div className="space-y-4">
            {content.steps.map((step, index) => (
              <StepCard
                key={index}
                step={index + 1}
                title={step.title}
                description={step.description}
                icon={step.icon}
                color={content.color}
              />
            ))}
          </div>
        </div>

        {/* Right: Architecture & Tech Stack */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Layers className={cn("w-5 h-5", colorClasses[content.color].text)} />
            <h3 className="text-lg font-semibold">Model Architecture</h3>
          </div>
          
          <ArchitectureDiagram layers={content.architecture} color={content.color} />

          {/* Tech Stack */}
          <div className={cn(
            "p-4 rounded-xl border",
            colorClasses[content.color].bg,
            colorClasses[content.color].border
          )}>
            <div className="flex items-center gap-2 mb-3">
              <Code2 className={cn("w-4 h-4", colorClasses[content.color].text)} />
              <h4 className="font-medium">Technologies Used</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {content.techStack.map((tech, index) => (
                <span
                  key={index}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium",
                    "bg-background/50 border border-border"
                  )}
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Key Concepts */}
          <div className={cn(
            "p-4 rounded-xl border",
            colorClasses[content.color].bg,
            colorClasses[content.color].border
          )}>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className={cn("w-4 h-4", colorClasses[content.color].text)} />
              <h4 className="font-medium">Key Concepts</h4>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {content.keyConcepts.map((concept, index) => (
                <li key={index} className="flex items-start gap-2">
                  <ArrowRight className={cn("w-3 h-3 mt-1 flex-shrink-0", colorClasses[content.color].text)} />
                  <span>{concept}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Learn More */}
          {content.resources && (
            <div className="p-4 rounded-xl bg-muted/30 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
                <h4 className="font-medium text-sm">Learn More</h4>
              </div>
              <ul className="space-y-2">
                {content.resources.map((resource, index) => (
                  <li key={index}>
                    <a 
                      href={resource.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      {resource.name}
                      <ExternalLink className="w-3 h-3" />
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
            description: "Tesseract segments the image into text lines and words using connected components.",
            icon: <Grid3X3 className="w-5 h-5" />,
          },
          {
            title: "Character Recognition",
            description: "LSTM neural network classifies each character based on shape patterns.",
            icon: <Brain className="w-5 h-5" />,
          },
          {
            title: "AI Correction",
            description: "Language model post-processes text to fix OCR errors and improve accuracy.",
            icon: <Sparkles className="w-5 h-5" />,
          },
        ],
        architecture: [
          { name: "Raw Image", description: "Camera capture / upload" },
          { name: "Preprocessing", description: "Contrast, grayscale, sharpen" },
          { name: "Tesseract Engine", description: "LSTM-based OCR" },
          { name: "AI Correction", description: "LLM error correction" },
          { name: "Output", description: "Clean extracted text" },
        ],
        techStack: ["Tesseract.js", "Canvas API", "Lovable AI", "WebWorkers"],
        keyConcepts: [
          "LSTM networks handle variable-length sequences of characters",
          "Image preprocessing dramatically improves recognition accuracy",
          "Multi-language support through trained language data files",
          "AI post-processing catches context-dependent errors",
        ],
        resources: [
          { name: "Tesseract.js Docs", url: "https://tesseract.projectnaptha.com/" },
          { name: "OCR Wikipedia", url: "https://en.wikipedia.org/wiki/Optical_character_recognition" },
        ],
      };

    case "background":
      return {
        title: "AI Background Removal",
        subtitle: "Discover how transformer-based segmentation models separate subjects from backgrounds.",
        color: "purple",
        steps: [
          {
            title: "Image Encoding",
            description: "The image is divided into patches and encoded by a Vision Transformer (ViT).",
            icon: <Grid3X3 className="w-5 h-5" />,
          },
          {
            title: "Semantic Segmentation",
            description: "Each pixel is classified as foreground (subject) or background.",
            icon: <Layers className="w-5 h-5" />,
          },
          {
            title: "Alpha Matte Generation",
            description: "Edge refinement produces smooth alpha channel for clean cutouts.",
            icon: <Boxes className="w-5 h-5" />,
          },
          {
            title: "Compositing",
            description: "Foreground is composited onto new backgrounds (transparent, solid, or image).",
            icon: <Workflow className="w-5 h-5" />,
          },
        ],
        architecture: [
          { name: "Input Image", description: "User uploaded photo" },
          { name: "Vision Transformer", description: "Patch-based encoding" },
          { name: "Segmentation Head", description: "Per-pixel classification" },
          { name: "Alpha Refinement", description: "Edge smoothing" },
          { name: "Output", description: "RGBA image with transparency" },
        ],
        techStack: ["Hugging Face Transformers", "@huggingface/transformers", "WebGPU", "Canvas API"],
        keyConcepts: [
          "Transformers use self-attention to capture global image context",
          "Semantic segmentation assigns a class label to every pixel",
          "Alpha mattes enable smooth foreground-background blending",
          "Manual brush editing allows fine-tuning of automatic results",
        ],
        resources: [
          { name: "Hugging Face Transformers.js", url: "https://huggingface.co/docs/transformers.js" },
          { name: "Vision Transformers (ViT)", url: "https://arxiv.org/abs/2010.11929" },
        ],
      };
  }
}
