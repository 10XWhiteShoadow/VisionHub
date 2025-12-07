import { useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import Webcam from "react-webcam";
import { Camera, CameraOff, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WebcamViewProps {
  onFrame?: (video: HTMLVideoElement) => void;
  isProcessing?: boolean;
  error?: string | null;
  children?: React.ReactNode;
  className?: string;
  mirrored?: boolean;
}

export interface WebcamViewRef {
  getVideo: () => HTMLVideoElement | null;
  capture: () => string | null;
}

const videoConstraints = {
  width: 640,
  height: 480,
  facingMode: "user",
};

/**
 * Reusable webcam component with overlay support
 * Handles permissions, errors, and provides video access for processing
 */
export const WebcamView = forwardRef<WebcamViewRef, WebcamViewProps>(
  ({ onFrame, isProcessing, error, children, className, mirrored = true }, ref) => {
    const webcamRef = useRef<Webcam>(null);

    // Expose methods to parent components
    useImperativeHandle(ref, () => ({
      getVideo: () => webcamRef.current?.video || null,
      capture: () => webcamRef.current?.getScreenshot() || null,
    }));

    // Handle webcam ready state
    const handleUserMedia = useCallback(() => {
      // Webcam is ready, start processing if callback provided
      if (onFrame && webcamRef.current?.video) {
        const processFrame = () => {
          if (webcamRef.current?.video && webcamRef.current.video.readyState === 4) {
            onFrame(webcamRef.current.video);
          }
          requestAnimationFrame(processFrame);
        };
        requestAnimationFrame(processFrame);
      }
    }, [onFrame]);

    return (
      <div className={cn("webcam-container relative", className)}>
        {/* Webcam video */}
        <Webcam
          ref={webcamRef}
          audio={false}
          videoConstraints={videoConstraints}
          onUserMedia={handleUserMedia}
          mirrored={mirrored}
          className="w-full h-full object-cover rounded-xl"
          screenshotFormat="image/jpeg"
        />

        {/* Processing indicator */}
        {isProcessing && (
          <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/80 backdrop-blur border border-primary/30">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-mono text-primary">Processing</span>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/90 backdrop-blur-lg rounded-xl">
            <div className="text-center p-6">
              <CameraOff className="w-12 h-12 mx-auto mb-4 text-destructive" />
              <p className="text-destructive font-medium mb-2">Camera Error</p>
              <p className="text-muted-foreground text-sm mb-4">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Canvas overlay for detection rendering */}
        {children}

        {/* Corner decorations */}
        <div className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-primary/50 rounded-tl" />
        <div className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-primary/50 rounded-tr" />
        <div className="absolute bottom-2 left-2 w-6 h-6 border-l-2 border-b-2 border-primary/50 rounded-bl" />
        <div className="absolute bottom-2 right-2 w-6 h-6 border-r-2 border-b-2 border-primary/50 rounded-br" />
      </div>
    );
  }
);

WebcamView.displayName = "WebcamView";
