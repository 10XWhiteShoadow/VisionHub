import { useState, useRef, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Download, Loader2, ImageIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { removeBackground, loadImage } from "@/lib/backgroundRemoval";

export default function BackgroundRemoval() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const url = URL.createObjectURL(file);
    setOriginalImage(url);
    setProcessedImage(null);
    setIsProcessing(true);
    setProgressMessage("Starting...");

    try {
      const img = await loadImage(file);
      const resultBlob = await removeBackground(img, setProgressMessage);
      const resultUrl = URL.createObjectURL(resultBlob);
      setProcessedImage(resultUrl);
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

  const handleDownload = useCallback(() => {
    if (!processedImage) return;
    
    const link = document.createElement("a");
    link.href = processedImage;
    link.download = "background-removed.png";
    link.click();
    toast.success("Image downloaded!");
  }, [processedImage]);

  const handleClear = useCallback(() => {
    setOriginalImage(null);
    setProcessedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold gradient-text-cyber">Background Removal</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Remove backgrounds from your images using AI-powered segmentation. 
              All processing happens locally in your browser.
            </p>
          </div>

          {/* Upload Area */}
          {!originalImage && (
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
          {originalImage && (
            <div className="space-y-6">
              {/* Action Buttons */}
              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={handleClear}
                  disabled={isProcessing}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear
                </Button>
                <Button
                  onClick={handleDownload}
                  disabled={!processedImage || isProcessing}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Result
                </Button>
              </div>

              {/* Image Comparison */}
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

                {/* Processed */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Background Removed</CardTitle>
                    <CardDescription>
                      {isProcessing ? progressMessage : "Transparent PNG"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="aspect-square rounded-lg overflow-hidden flex items-center justify-center"
                      style={{
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
                  </CardContent>
                </Card>
              </div>

              {/* Info */}
              <Card className="glass-card">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground text-center">
                    ✨ All processing happens locally in your browser using WebGPU acceleration. 
                    Your images are never uploaded to any server.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
