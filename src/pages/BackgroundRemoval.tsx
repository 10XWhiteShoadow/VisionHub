import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Upload, Download, Loader2, ImageIcon, Trash2, Paintbrush, Eraser, RotateCcw, History, Clock, Save, SlidersHorizontal, Palette, Image as ImageLucide, Undo2, Redo2, GraduationCap, Video } from "lucide-react";
import { ModelLearnContent } from "@/components/ModelLearnContent";
import { ImageComparisonSlider } from "@/components/ImageComparisonSlider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { removeBackground, loadImage } from "@/lib/backgroundRemoval";
import { cn } from "@/lib/utils";
import { useBackgroundRemovalHistory, BackgroundRemovalRecord } from "@/hooks/useBackgroundRemovalHistory";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

type BrushMode = "erase" | "restore";
type BackgroundType = "transparent" | "solid" | "image";

const PRESET_COLORS = [
  "#FFFFFF", "#000000", "#FF0000", "#00FF00", "#0000FF", 
  "#FFFF00", "#FF00FF", "#00FFFF", "#808080", "#FFA500",
  "#800080", "#008080", "#FFC0CB", "#A52A2A", "#F5F5DC"
];

const MAX_HISTORY_SIZE = 50;

export default function BackgroundRemoval() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const [brushMode, setBrushMode] = useState<BrushMode>("erase");
  const [isDrawing, setIsDrawing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [originalBlob, setOriginalBlob] = useState<Blob | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [backgroundType, setBackgroundType] = useState<BackgroundType>("transparent");
  const [backgroundColor, setBackgroundColor] = useState("#FFFFFF");
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [compositeImage, setCompositeImage] = useState<string | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  
  // Undo/Redo state
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);
  
  const { history, isLoading: historyLoading, saveToHistory, deleteFromHistory } = useBackgroundRemovalHistory();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const processedImageRef = useRef<HTMLImageElement | null>(null);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Initialize canvas when entering editor mode
  useEffect(() => {
    console.log("Canvas effect triggered:", { 
      showEditor, 
      hasProcessedBlob: !!processedBlob, 
      hasOriginalBlob: !!originalBlob,
      hasCanvasRef: !!canvasRef.current,
      hasMaskCanvasRef: !!maskCanvasRef.current
    });
    
    if (!showEditor || !processedBlob || !originalBlob) {
      return;
    }
    
    // Small delay to ensure canvas is mounted
    const timeoutId = setTimeout(async () => {
      const canvas = canvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      
      console.log("After timeout - Canvas refs:", { hasCanvas: !!canvas, hasMaskCanvas: !!maskCanvas });
      
      if (!canvas || !maskCanvas) {
        console.error("Canvas refs not available");
        return;
      }
      
      const ctx = canvas.getContext("2d");
      const maskCtx = maskCanvas.getContext("2d");
      
      if (!ctx || !maskCtx) {
        console.error("Canvas contexts not available");
        return;
      }

      setCanvasReady(false);
      setUndoStack([]);
      setRedoStack([]);

      // Use createImageBitmap to avoid canvas tainting issues with blob URLs
      try {
        console.log("Creating bitmaps from blobs...");
        const processedBitmap = await createImageBitmap(processedBlob);
        const originalBitmap = await createImageBitmap(originalBlob);
        console.log("Bitmaps created:", { 
          processedWidth: processedBitmap.width, 
          processedHeight: processedBitmap.height,
          originalWidth: originalBitmap.width,
          originalHeight: originalBitmap.height
        });
        
        // Set canvas size
        const maxSize = 600;
        let width = processedBitmap.width;
        let height = processedBitmap.height;
        
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }
        
        console.log("Setting canvas dimensions:", { width, height });
        canvas.width = width;
        canvas.height = height;
        maskCanvas.width = width;
        maskCanvas.height = height;
        
        // Create original image from bitmap first
        const origCanvas = document.createElement("canvas");
        origCanvas.width = width;
        origCanvas.height = height;
        const origCtx = origCanvas.getContext("2d");
        if (origCtx) {
          origCtx.drawImage(originalBitmap, 0, 0, width, height);
          const origDataUrl = origCanvas.toDataURL("image/png");
          const origImg = new Image();
          await new Promise<void>((resolve) => {
            origImg.onload = () => {
              originalImageRef.current = origImg;
              resolve();
            };
            origImg.src = origDataUrl;
          });
        }
        
        // Create processed image from bitmap
        const procCanvas = document.createElement("canvas");
        procCanvas.width = width;
        procCanvas.height = height;
        const procCtx = procCanvas.getContext("2d");
        if (procCtx) {
          procCtx.drawImage(processedBitmap, 0, 0, width, height);
          const procDataUrl = procCanvas.toDataURL("image/png");
          const procImg = new Image();
          await new Promise<void>((resolve) => {
            procImg.onload = () => {
              processedImageRef.current = procImg;
              resolve();
            };
            procImg.src = procDataUrl;
          });
          
          // Initialize mask from processed image alpha
          const procImageData = procCtx.getImageData(0, 0, width, height);
          const maskImageData = maskCtx.createImageData(width, height);
          
          for (let i = 0; i < procImageData.data.length; i += 4) {
            const alpha = procImageData.data[i + 3];
            maskImageData.data[i] = alpha;
            maskImageData.data[i + 1] = alpha;
            maskImageData.data[i + 2] = alpha;
            maskImageData.data[i + 3] = 255;
          }
          
          maskCtx.putImageData(maskImageData, 0, 0);
          
          // Save initial mask state for undo
          setUndoStack([maskCtx.getImageData(0, 0, width, height)]);
          
          // Draw the initial image on the main canvas
          // Clear and draw checkerboard
          ctx.clearRect(0, 0, width, height);
          const patternSize = 10;
          for (let i = 0; i < width; i += patternSize) {
            for (let j = 0; j < height; j += patternSize) {
              ctx.fillStyle = ((i + j) / patternSize) % 2 === 0 ? "#e0e0e0" : "#ffffff";
              ctx.fillRect(i, j, patternSize, patternSize);
            }
          }
          
          // Apply mask to original image and draw
          const finalCanvas = document.createElement("canvas");
          finalCanvas.width = width;
          finalCanvas.height = height;
          const finalCtx = finalCanvas.getContext("2d");
          if (finalCtx) {
            finalCtx.drawImage(originalBitmap, 0, 0, width, height);
            const finalImageData = finalCtx.getImageData(0, 0, width, height);
            const maskDataForDraw = maskCtx.getImageData(0, 0, width, height);
            
            for (let i = 0; i < finalImageData.data.length; i += 4) {
              const maskValue = maskDataForDraw.data[i];
              finalImageData.data[i + 3] = maskValue;
            }
            
            finalCtx.putImageData(finalImageData, 0, 0);
            ctx.drawImage(finalCanvas, 0, 0);
            console.log("Canvas drawing complete");
          }
        }
        
        setCanvasReady(true);
      } catch (error) {
        console.error("Error initializing canvas:", error);
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [showEditor, processedBlob, originalBlob]);

  // Redraw canvas when ready
  useEffect(() => {
    if (canvasReady && originalImageRef.current && processedImageRef.current) {
      redrawCanvas();
    }
  }, [canvasReady]);


  // Generate composite image when background settings change
  useEffect(() => {
    if (!processedImage) {
      setCompositeImage(null);
      return;
    }

    if (backgroundType === "transparent") {
      setCompositeImage(null);
      return;
    }

    const generateComposite = async () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const fgImg = new Image();
      fgImg.crossOrigin = "anonymous";
      
      fgImg.onload = async () => {
        canvas.width = fgImg.width;
        canvas.height = fgImg.height;

        // Draw background
        if (backgroundType === "solid") {
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (backgroundType === "image" && backgroundImage) {
          const bgImg = new Image();
          bgImg.crossOrigin = "anonymous";
          
          await new Promise<void>((resolve) => {
            bgImg.onload = () => {
              // Scale background to cover the canvas
              const scale = Math.max(canvas.width / bgImg.width, canvas.height / bgImg.height);
              const x = (canvas.width - bgImg.width * scale) / 2;
              const y = (canvas.height - bgImg.height * scale) / 2;
              ctx.drawImage(bgImg, x, y, bgImg.width * scale, bgImg.height * scale);
              resolve();
            };
            bgImg.onerror = () => resolve();
            bgImg.src = backgroundImage;
          });
        }

        // Draw foreground (processed image with transparency)
        ctx.drawImage(fgImg, 0, 0);

        // Create composite URL
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            setCompositeImage(url);
          }
        }, "image/png");
      };
      
      fgImg.src = processedImage;
    };

    generateComposite();
  }, [processedImage, backgroundType, backgroundColor, backgroundImage]);

  const handleBackgroundImageSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const url = URL.createObjectURL(file);
    setBackgroundImage(url);
    setBackgroundType("image");
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const url = URL.createObjectURL(file);
    setOriginalImage(url);
    setOriginalBlob(file);
    setProcessedImage(null);
    setProcessedBlob(null);
    setShowEditor(false);
    setShowHistory(false);
    setIsProcessing(true);
    setProgressMessage("Starting...");

    try {
      const img = await loadImage(file);
      const resultBlob = await removeBackground(img, setProgressMessage);
      const resultUrl = URL.createObjectURL(resultBlob);
      setProcessedImage(resultUrl);
      setProcessedBlob(resultBlob);
      toast.success("Background removed successfully!");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to remove background. Please try again.");
    } finally {
      setIsProcessing(false);
      setProgressMessage("");
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      };
    }
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const draw = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas || !originalImageRef.current || !processedImageRef.current) return;
    
    const ctx = canvas.getContext("2d");
    const maskCtx = maskCanvas.getContext("2d");
    if (!ctx || !maskCtx) return;

    // Update mask
    maskCtx.globalCompositeOperation = "source-over";
    maskCtx.fillStyle = brushMode === "erase" ? "black" : "white";
    maskCtx.beginPath();
    maskCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    maskCtx.fill();

    // Redraw the image with the updated mask
    redrawCanvas();
  }, [brushMode, brushSize]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas || !originalImageRef.current || !processedImageRef.current) return;
    
    const ctx = canvas.getContext("2d");
    const maskCtx = maskCanvas.getContext("2d");
    if (!ctx || !maskCtx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw checkerboard pattern for transparency
    const patternSize = 10;
    for (let i = 0; i < width; i += patternSize) {
      for (let j = 0; j < height; j += patternSize) {
        ctx.fillStyle = ((i + j) / patternSize) % 2 === 0 ? "#e0e0e0" : "#ffffff";
        ctx.fillRect(i, j, patternSize, patternSize);
      }
    }

    // Create a temporary canvas for the result
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;

    // Draw original image
    tempCtx.drawImage(originalImageRef.current, 0, 0, width, height);
    
    // Get image data
    const imageData = tempCtx.getImageData(0, 0, width, height);
    const maskData = maskCtx.getImageData(0, 0, width, height);
    
    // Apply mask to alpha channel
    for (let i = 0; i < imageData.data.length; i += 4) {
      // White in mask = keep (255), Black = remove (0)
      const maskValue = maskData.data[i]; // R channel of mask
      imageData.data[i + 3] = maskValue; // Apply to alpha
    }
    
    tempCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(tempCanvas, 0, 0);
  }, []);

  // Save current mask state to undo stack
  const saveMaskState = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    
    const maskCtx = maskCanvas.getContext("2d");
    if (!maskCtx) return;
    
    const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    setUndoStack(prev => {
      const newStack = [...prev, maskData];
      // Limit stack size
      if (newStack.length > MAX_HISTORY_SIZE) {
        return newStack.slice(-MAX_HISTORY_SIZE);
      }
      return newStack;
    });
    setRedoStack([]); // Clear redo stack on new action
  }, []);

  const handleUndo = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas || undoStack.length <= 1) return;
    
    const maskCtx = maskCanvas.getContext("2d");
    if (!maskCtx) return;
    
    // Save current state to redo stack
    const currentState = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    setRedoStack(prev => [...prev, currentState]);
    
    // Pop and apply previous state
    const newUndoStack = [...undoStack];
    newUndoStack.pop(); // Remove current state
    const previousState = newUndoStack[newUndoStack.length - 1];
    
    if (previousState) {
      maskCtx.putImageData(previousState, 0, 0);
      setUndoStack(newUndoStack);
      redrawCanvas();
    }
  }, [undoStack, redrawCanvas]);

  const handleRedo = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas || redoStack.length === 0) return;
    
    const maskCtx = maskCanvas.getContext("2d");
    if (!maskCtx) return;
    
    // Get the state to redo
    const newRedoStack = [...redoStack];
    const stateToRedo = newRedoStack.pop();
    
    if (stateToRedo) {
      // Save current state to undo stack
      const currentState = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
      setUndoStack(prev => [...prev, currentState]);
      
      // Apply redo state
      maskCtx.putImageData(stateToRedo, 0, 0);
      setRedoStack(newRedoStack);
      redrawCanvas();
    }
  }, [redoStack, redrawCanvas]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    if (!showEditor) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        handleRedo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showEditor, handleUndo, handleRedo]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    saveMaskState(); // Save state before drawing
    setIsDrawing(true);
    const coords = getCanvasCoordinates(e);
    if (coords) draw(coords.x, coords.y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const coords = getCanvasCoordinates(e);
    if (coords) draw(coords.x, coords.y);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    saveMaskState(); // Save state before drawing
    setIsDrawing(true);
    const coords = getCanvasCoordinates(e);
    if (coords) draw(coords.x, coords.y);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const coords = getCanvasCoordinates(e);
    if (coords) draw(coords.x, coords.y);
  };

  const handleResetMask = useCallback(async () => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas || !processedBlob) return;
    
    const maskCtx = maskCanvas.getContext("2d");
    if (!maskCtx) return;
    
    try {
      // Use createImageBitmap to avoid CORS issues
      const bitmap = await createImageBitmap(processedBlob);
      
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = maskCanvas.width;
      tempCanvas.height = maskCanvas.height;
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) return;
      
      tempCtx.drawImage(bitmap, 0, 0, maskCanvas.width, maskCanvas.height);
      const imageData = tempCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
      
      // Create mask from alpha channel
      maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      const maskImageData = maskCtx.createImageData(maskCanvas.width, maskCanvas.height);
      
      for (let i = 0; i < imageData.data.length; i += 4) {
        const alpha = imageData.data[i + 3];
        maskImageData.data[i] = alpha;
        maskImageData.data[i + 1] = alpha;
        maskImageData.data[i + 2] = alpha;
        maskImageData.data[i + 3] = 255;
      }
      
      maskCtx.putImageData(maskImageData, 0, 0);
      redrawCanvas();
      toast.success("Mask reset!");
    } catch (error) {
      console.error("Error resetting mask:", error);
      toast.error("Failed to reset mask");
    }
  }, [processedBlob, redrawCanvas]);

  const handleDownload = useCallback(() => {
    if (showEditor && canvasRef.current && maskCanvasRef.current && originalImageRef.current) {
      // Export edited version
      const canvas = canvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = canvas.width;
      exportCanvas.height = canvas.height;
      const exportCtx = exportCanvas.getContext("2d");
      if (!exportCtx) return;
      
      // Draw original
      exportCtx.drawImage(originalImageRef.current, 0, 0, canvas.width, canvas.height);
      
      // Apply mask
      const imageData = exportCtx.getImageData(0, 0, canvas.width, canvas.height);
      const maskCtx = maskCanvas.getContext("2d");
      if (!maskCtx) return;
      
      const maskData = maskCtx.getImageData(0, 0, canvas.width, canvas.height);
      
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i + 3] = maskData.data[i];
      }
      
      exportCtx.putImageData(imageData, 0, 0);
      
      exportCanvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "background-removed-edited.png";
        link.click();
        URL.revokeObjectURL(url);
        toast.success("Image downloaded!");
      }, "image/png");
    } else if (compositeImage && backgroundType !== "transparent") {
      // Download composite with background - need to fetch and convert to blob for proper download
      fetch(compositeImage)
        .then(res => res.blob())
        .then(blob => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = backgroundType === "solid" ? "background-replaced-color.png" : "background-replaced-image.png";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          toast.success("Image downloaded!");
        });
    } else if (processedImage) {
      // For blob URLs, need to fetch and recreate for download
      fetch(processedImage)
        .then(res => res.blob())
        .then(blob => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "background-removed.png";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          toast.success("Image downloaded!");
        });
    }
  }, [showEditor, processedImage, compositeImage, backgroundType]);

  const handleClear = useCallback(() => {
    setOriginalImage(null);
    setProcessedImage(null);
    setOriginalBlob(null);
    setProcessedBlob(null);
    setShowEditor(false);
    setBackgroundType("transparent");
    setBackgroundImage(null);
    setCompositeImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (bgImageInputRef.current) {
      bgImageInputRef.current.value = "";
    }
  }, []);

  const handleSaveToHistory = async () => {
    if (!originalBlob || !processedBlob) {
      toast.error("No image to save");
      return;
    }
    
    setIsSaving(true);
    try {
      const result = await saveToHistory(originalBlob, processedBlob);
      if (result) {
        toast.success("Saved to history!");
      } else {
        toast.error("Failed to save to history");
      }
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Failed to save to history");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFromHistory = async (record: BackgroundRemovalRecord) => {
    const success = await deleteFromHistory(record.id, record.original_image_url, record.processed_image_url);
    if (success) {
      toast.success("Deleted from history");
    } else {
      toast.error("Failed to delete");
    }
  };

  const handleLoadFromHistory = (record: BackgroundRemovalRecord) => {
    setOriginalImage(record.original_image_url);
    setProcessedImage(record.processed_image_url);
    setShowHistory(false);
    setShowEditor(false);
    setOriginalBlob(null);
    setProcessedBlob(null);
    toast.success("Loaded from history");
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold gradient-text-cyber">Background Removal</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Remove backgrounds from your images using AI-powered segmentation. 
              Use the brush tool for precise manual refinement.
            </p>
            <Button
              variant="outline"
              onClick={() => setShowHistory(!showHistory)}
              className="mt-2"
            >
              <History className="w-4 h-4 mr-2" />
              {showHistory ? "Hide History" : "View History"}
            </Button>
          </div>

          {/* History Section */}
          {showHistory && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Background Removal History
                </CardTitle>
                <CardDescription>
                  Your previously processed images
                </CardDescription>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No history yet. Process an image and save it to see it here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {history.map((record) => (
                      <div
                        key={record.id}
                        className="group relative rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors"
                      >
                        <div
                          className="aspect-square"
                          style={{
                            backgroundImage: "linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%), linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)",
                            backgroundSize: "10px 10px",
                            backgroundPosition: "0 0, 0 5px, 5px -5px, -5px 0px"
                          }}
                        >
                          <img
                            src={record.processed_image_url}
                            alt="Processed"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleLoadFromHistory(record)}
                          >
                            <ImageIcon className="w-4 h-4 mr-1" />
                            Load
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteFromHistory(record)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm px-2 py-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(record.created_at), "MMM d, yyyy HH:mm")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Upload Area */}
          {!originalImage && !showHistory && (
            <Card className="glass-card border-dashed border-2 border-primary/30 hover:border-primary/50 transition-colors">
              <CardContent className="p-12">
                <div
                  className="flex flex-col items-center justify-center gap-4 cursor-pointer"
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="w-10 h-10 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-medium">Drop an image here or click to upload</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Supports JPG, PNG, WebP
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {originalImage && !showEditor && (
            <div className="space-y-6">
              {/* Action Buttons */}
              <div className="flex justify-center gap-4 flex-wrap">
                <Button
                  variant="outline"
                  onClick={handleClear}
                  disabled={isProcessing}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear
                </Button>
                <Button
                  variant={showCompare ? "default" : "outline"}
                  onClick={() => setShowCompare(!showCompare)}
                  disabled={!processedImage || isProcessing}
                >
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  {showCompare ? "Hide Compare" : "Compare"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowEditor(true)}
                  disabled={!processedImage || isProcessing}
                >
                  <Paintbrush className="w-4 h-4 mr-2" />
                  Edit with Brush
                </Button>
                <Button
                  onClick={handleDownload}
                  disabled={!processedImage || isProcessing}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Result
                </Button>
                {originalBlob && processedBlob && (
                  <Button
                    variant="secondary"
                    onClick={handleSaveToHistory}
                    disabled={isProcessing || isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save to History
                  </Button>
                )}
              </div>

              {/* Comparison Slider */}
              {showCompare && processedImage && (
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <SlidersHorizontal className="w-5 h-5" />
                      Compare Original vs Processed
                    </CardTitle>
                    <CardDescription>
                      Drag the slider to compare the original and processed images
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="max-w-2xl mx-auto">
                      <ImageComparisonSlider 
                        originalImage={originalImage}
                        processedImage={processedImage}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Image Comparison - Side by Side */}
              {!showCompare && (
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Original */}
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="text-lg">Original</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                        <img
                          src={originalImage}
                          alt="Original"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Processed with Background Options */}
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {backgroundType === "transparent" ? "Background Removed" : "New Background"}
                      </CardTitle>
                      <CardDescription>
                        {isProcessing ? progressMessage : 
                          backgroundType === "transparent" ? "Transparent PNG" :
                          backgroundType === "solid" ? "Solid color background" : "Custom image background"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Background preview */}
                      <div 
                        className="aspect-square rounded-lg overflow-hidden flex items-center justify-center relative"
                        style={backgroundType === "transparent" ? {
                          backgroundImage: "linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%), linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)",
                          backgroundSize: "20px 20px",
                          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px"
                        } : backgroundType === "solid" ? {
                          backgroundColor: backgroundColor
                        } : backgroundImage ? {
                          backgroundImage: `url(${backgroundImage})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center"
                        } : {
                          backgroundImage: "linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%), linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)",
                          backgroundSize: "20px 20px",
                          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px"
                        }}
                      >
                        {isProcessing ? (
                          <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-12 h-12 text-primary animate-spin" />
                            <p className="text-sm text-muted-foreground">{progressMessage}</p>
                          </div>
                        ) : (compositeImage && backgroundType !== "transparent") ? (
                          <img
                            src={compositeImage}
                            alt="Composite"
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : processedImage ? (
                          <img
                            src={processedImage}
                            alt="Processed"
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <ImageIcon className="w-12 h-12" />
                            <p className="text-sm">Processing...</p>
                          </div>
                        )}
                      </div>

                      {/* Background Options */}
                      {processedImage && !isProcessing && (
                        <div className="space-y-3 pt-2 border-t border-border">
                          <Label className="text-sm font-medium flex items-center gap-2">
                            <Palette className="w-4 h-4" />
                            Background Options
                          </Label>
                          <Tabs value={backgroundType} onValueChange={(v) => setBackgroundType(v as BackgroundType)} className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                              <TabsTrigger value="transparent">Transparent</TabsTrigger>
                              <TabsTrigger value="solid">Color</TabsTrigger>
                              <TabsTrigger value="image">Image</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="solid" className="mt-3 space-y-3">
                              <div className="flex flex-wrap gap-2">
                                {PRESET_COLORS.map((color) => (
                                  <button
                                    key={color}
                                    onClick={() => setBackgroundColor(color)}
                                    className={cn(
                                      "w-8 h-8 rounded-lg border-2 transition-all hover:scale-110",
                                      backgroundColor === color ? "border-primary ring-2 ring-primary/30" : "border-border"
                                    )}
                                    style={{ backgroundColor: color }}
                                    title={color}
                                  />
                                ))}
                              </div>
                              <div className="flex items-center gap-2">
                                <Label htmlFor="customColor" className="text-xs text-muted-foreground">Custom:</Label>
                                <Input
                                  id="customColor"
                                  type="color"
                                  value={backgroundColor}
                                  onChange={(e) => setBackgroundColor(e.target.value)}
                                  className="w-12 h-8 p-1 cursor-pointer"
                                />
                                <Input
                                  type="text"
                                  value={backgroundColor}
                                  onChange={(e) => setBackgroundColor(e.target.value)}
                                  className="w-24 h-8 text-xs font-mono"
                                  placeholder="#FFFFFF"
                                />
                              </div>
                            </TabsContent>
                            
                            <TabsContent value="image" className="mt-3 space-y-3">
                              <div 
                                className={cn(
                                  "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                                  backgroundImage ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/30"
                                )}
                                onClick={() => bgImageInputRef.current?.click()}
                              >
                                {backgroundImage ? (
                                  <div className="flex items-center gap-3">
                                    <img 
                                      src={backgroundImage} 
                                      alt="Background" 
                                      className="w-16 h-16 object-cover rounded"
                                    />
                                    <div className="text-left flex-1">
                                      <p className="text-sm font-medium">Background image set</p>
                                      <p className="text-xs text-muted-foreground">Click to change</p>
                                    </div>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setBackgroundImage(null);
                                        if (bgImageInputRef.current) bgImageInputRef.current.value = "";
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-2">
                                    <ImageLucide className="w-8 h-8 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">Click to upload background image</p>
                                  </div>
                                )}
                              </div>
                              <input
                                ref={bgImageInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleBackgroundImageSelect(file);
                                }}
                              />
                            </TabsContent>

                            <TabsContent value="transparent" className="mt-3">
                              <p className="text-sm text-muted-foreground">
                                Download as a transparent PNG for use in other designs.
                              </p>
                            </TabsContent>
                          </Tabs>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* Brush Editor */}
          {showEditor && (
            <div className="space-y-6">
              {/* Editor Controls */}
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        onClick={() => setShowEditor(false)}
                      >
                        ← Back
                      </Button>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant={brushMode === "erase" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setBrushMode("erase")}
                        >
                          <Eraser className="w-4 h-4 mr-2" />
                          Erase
                        </Button>
                        <Button
                          variant={brushMode === "restore" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setBrushMode("restore")}
                        >
                          <Paintbrush className="w-4 h-4 mr-2" />
                          Restore
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <span className="text-sm text-muted-foreground">Size:</span>
                        <Slider
                          value={[brushSize]}
                          onValueChange={(v) => setBrushSize(v[0])}
                          min={5}
                          max={100}
                          step={1}
                          className="flex-1"
                        />
                        <span className="text-sm font-mono w-8">{brushSize}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleUndo}
                        disabled={undoStack.length <= 1}
                        title="Undo (Ctrl+Z)"
                      >
                        <Undo2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleRedo}
                        disabled={redoStack.length === 0}
                        title="Redo (Ctrl+Y)"
                      >
                        <Redo2 className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleResetMask}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset
                      </Button>
                      <Button onClick={handleDownload}>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Canvas Editor */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Brush Editor</CardTitle>
                  <CardDescription>
                    {brushMode === "erase" 
                      ? "Paint over areas to remove (make transparent)" 
                      : "Paint over areas to restore from original"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <div 
                      className="relative inline-block rounded-lg overflow-hidden border border-border"
                      style={{
                        cursor: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${brushSize}" height="${brushSize}" viewBox="0 0 ${brushSize} ${brushSize}"><circle cx="${brushSize/2}" cy="${brushSize/2}" r="${brushSize/2 - 1}" fill="none" stroke="${brushMode === 'erase' ? 'red' : 'green'}" stroke-width="2"/></svg>') ${brushSize/2} ${brushSize/2}, crosshair`
                      }}
                    >
                      <canvas
                        ref={canvasRef}
                        className="max-w-full touch-none"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleMouseUp}
                      />
                      <canvas ref={maskCanvasRef} className="hidden" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Instructions */}
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-start gap-2">
                      <div className="w-4 h-4 rounded-full bg-destructive/20 border-2 border-destructive mt-0.5" />
                      <div>
                        <p className="font-medium">Erase Mode</p>
                        <p className="text-muted-foreground">Paint to remove areas (make transparent)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-4 h-4 rounded-full bg-green-500/20 border-2 border-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Restore Mode</p>
                        <p className="text-muted-foreground">Paint to bring back areas from original</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Info */}
          {originalImage && !showEditor && (
            <Card className="glass-card">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground text-center">
                  ✨ All processing happens locally in your browser using WebGPU acceleration. 
                  Your images are never uploaded to any server.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
