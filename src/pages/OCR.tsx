import { useState, useRef, useCallback, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { StatsDisplay } from "@/components/StatsDisplay";
import { Button } from "@/components/ui/button";
import { FileText, Camera, Copy, RefreshCw, Languages, Settings, Loader2, Sparkles } from "lucide-react";
import Tesseract from "tesseract.js";
import Webcam from "react-webcam";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const languages = [
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
];

// OCR language codes for better recognition
const ocrLanguages = [
  { code: "eng", name: "English" },
  { code: "spa", name: "Spanish" },
  { code: "fra", name: "French" },
  { code: "deu", name: "German" },
  { code: "chi_sim", name: "Chinese (Simplified)" },
  { code: "hin", name: "Hindi" },
];

/**
 * OCR & Translation page
 * Uses Tesseract.js with preprocessing for better accuracy
 */
export default function OCR() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [correctedText, setCorrectedText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [selectedLang, setSelectedLang] = useState("es");
  const [ocrLang, setOcrLang] = useState("eng");
  const [confidence, setConfidence] = useState(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  
  const webcamRef = useRef<Webcam>(null);
  const workerRef = useRef<Tesseract.Worker | null>(null);

  // Initialize Tesseract worker
  useEffect(() => {
    const initWorker = async () => {
      const worker = await Tesseract.createWorker(ocrLang, 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });
      workerRef.current = worker;
    };
    initWorker();

    return () => {
      workerRef.current?.terminate();
    };
  }, [ocrLang]);

  // Advanced image preprocessing for better OCR - IMPROVED
  const preprocessImage = useCallback((imageData: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(imageData);
          return;
        }

        // Scale up 2x (not 3x - too much can blur text)
        const scale = 2;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        // Disable smoothing for sharper text
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Get image data for processing
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        
        // Step 1: Convert to grayscale and collect stats
        const grayscale = new Uint8Array(data.length / 4);
        let minGray = 255, maxGray = 0;
        
        for (let i = 0; i < data.length; i += 4) {
          const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
          grayscale[i / 4] = gray;
          if (gray < minGray) minGray = gray;
          if (gray > maxGray) maxGray = gray;
        }
        
        // Step 2: Apply contrast stretching (normalize to full 0-255 range)
        const range = maxGray - minGray || 1;
        for (let i = 0; i < grayscale.length; i++) {
          grayscale[i] = Math.round(((grayscale[i] - minGray) / range) * 255);
        }
        
        // Step 3: Apply sharpening using unsharp mask
        const width = canvas.width;
        const height = canvas.height;
        const sharpened = new Uint8Array(grayscale.length);
        const sharpenAmount = 0.5;
        
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            // Simple 3x3 blur for unsharp mask
            const blur = (
              grayscale[idx - width - 1] + grayscale[idx - width] + grayscale[idx - width + 1] +
              grayscale[idx - 1] + grayscale[idx] + grayscale[idx + 1] +
              grayscale[idx + width - 1] + grayscale[idx + width] + grayscale[idx + width + 1]
            ) / 9;
            
            const sharp = Math.round(grayscale[idx] + sharpenAmount * (grayscale[idx] - blur));
            sharpened[idx] = Math.max(0, Math.min(255, sharp));
          }
        }
        
        // Step 4: Apply adaptive thresholding OR keep grayscale (grayscale often works better)
        // For OCR, high-contrast grayscale often outperforms binary
        const useBinary = false; // Keep grayscale for better OCR
        
        for (let i = 0; i < data.length; i += 4) {
          const pixelIdx = i / 4;
          const value = sharpened[pixelIdx] || grayscale[pixelIdx];
          
          if (useBinary) {
            // Use local adaptive threshold
            const binary = value > 127 ? 255 : 0;
            data[i] = binary;
            data[i + 1] = binary;
            data[i + 2] = binary;
          } else {
            // Keep as high-contrast grayscale
            data[i] = value;
            data[i + 1] = value;
            data[i + 2] = value;
          }
        }
        
        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL("image/png", 1.0));
      };
      img.src = imageData;
    });
  }, []);

  // Capture image from webcam
  const captureImage = useCallback(async () => {
    const screenshot = webcamRef.current?.getScreenshot();
    if (screenshot) {
      setCapturedImage(screenshot);
      
      // Preprocess and process
      const processed = await preprocessImage(screenshot);
      setProcessedImage(processed);
      processImage(processed);
    }
  }, [preprocessImage]);

  // Process image with Tesseract OCR
  const processImage = async (imageData: string) => {
    setIsProcessing(true);
    setProgress(0);
    setExtractedText("");
    setTranslatedText("");

    try {
      // Recreate worker with current language if needed
      if (workerRef.current) {
        await workerRef.current.terminate();
      }
      
      const worker = await Tesseract.createWorker(ocrLang, 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });
      
      // Set parameters for better accuracy
      await worker.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
        preserve_interword_spaces: "1",
      });
      
      const result = await worker.recognize(imageData);
      await worker.terminate();

      const text = result.data.text.trim();
      setExtractedText(text);
      setConfidence(Math.round(result.data.confidence));
      
      // Process with AI for correction and translation
      if (text) {
        await processWithAI(text, selectedLang);
      }
    } catch (err) {
      console.error("OCR error:", err);
      setExtractedText("Error processing image. Try again with clearer text.");
      toast.error("Failed to process image");
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  // Process text with AI for correction and translation
  const processWithAI = async (text: string, targetLang: string) => {
    setIsAiProcessing(true);
    
    const langName = languages.find(l => l.code === targetLang)?.name || targetLang;
    
    try {
      const { data, error } = await supabase.functions.invoke('ocr-process', {
        body: { 
          text, 
          targetLanguage: langName,
          action: 'both'
        }
      });

      if (error) {
        console.error("AI processing error:", error);
        toast.error("AI processing failed. Using original text.");
        setCorrectedText(text);
        setTranslatedText("");
        return;
      }

      if (data.error) {
        toast.error(data.error);
        setCorrectedText(text);
        setTranslatedText("");
        return;
      }

      setCorrectedText(data.correctedText || text);
      setTranslatedText(data.translatedText || "");
      toast.success("Text corrected and translated!");
    } catch (err) {
      console.error("AI processing error:", err);
      toast.error("AI processing failed");
      setCorrectedText(text);
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  // Retake photo
  const retake = () => {
    setCapturedImage(null);
    setProcessedImage(null);
    setExtractedText("");
    setCorrectedText("");
    setTranslatedText("");
    setConfidence(0);
  };

  // Change translation language and re-translate
  const changeLanguage = async (lang: string) => {
    setSelectedLang(lang);
    if (correctedText || extractedText) {
      await processWithAI(correctedText || extractedText, lang);
    }
  };

  const stats = [
    { label: "Confidence", value: `${confidence}%`, color: "orange" as const },
    { label: "Characters", value: extractedText.length, color: "cyan" as const },
    { label: "Words", value: extractedText.split(/\s+/).filter(w => w).length, color: "purple" as const },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-neon-orange/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-neon-orange" />
              </div>
              <h1 className="text-3xl font-bold">OCR & Translation</h1>
            </div>
            <p className="text-muted-foreground">
              Extract text from images with enhanced preprocessing
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Button>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="glass-card rounded-2xl p-4 mb-6">
            <h4 className="font-medium mb-3">OCR Language (source text)</h4>
            <div className="flex gap-2 flex-wrap">
              {ocrLanguages.map((lang) => (
                <Button
                  key={lang.code}
                  variant={ocrLang === lang.code ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOcrLang(lang.code)}
                >
                  {lang.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {extractedText && <StatsDisplay stats={stats} className="mb-6" />}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Camera / Captured image */}
          <div className="glass-card rounded-2xl p-4">
            {!capturedImage ? (
              <>
                <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{
                      facingMode: "environment",
                      width: 1920,
                      height: 1080,
                    }}
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  variant="gradient"
                  className="w-full mt-4 gap-2"
                  onClick={captureImage}
                >
                  <Camera className="w-5 h-5" />
                  Capture & Extract Text
                </Button>
              </>
            ) : (
              <>
                <div className="relative rounded-xl overflow-hidden">
                  <img
                    src={processedImage || capturedImage}
                    alt="Captured"
                    className="w-full aspect-video object-cover"
                  />
                  {isProcessing && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur flex flex-col items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                      <div className="w-48 h-2 bg-muted rounded-full overflow-hidden mb-4">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Processing... {progress}%
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={retake}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Capture New
                  </Button>
                  {extractedText && (
                    <Button
                      variant="default"
                      className="flex-1 gap-2"
                      onClick={() => processImage(processedImage || capturedImage!)}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Retry OCR
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Results panel */}
          <div className="space-y-6">
            {/* Extracted text (raw OCR) */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-neon-cyan" />
                  Raw OCR Text
                </h3>
              </div>
              <div className="min-h-[80px] p-4 bg-card rounded-xl border border-border">
                {extractedText ? (
                  <p className="font-mono text-sm whitespace-pre-wrap text-muted-foreground">{extractedText}</p>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {isProcessing
                      ? "Extracting text from image..."
                      : "Capture an image with text to extract it"}
                  </p>
                )}
              </div>
            </div>

            {/* AI Corrected text */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-neon-green" />
                  AI Corrected Text
                  {isAiProcessing && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                </h3>
                {correctedText && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(correctedText)}
                    className="gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </Button>
                )}
              </div>
              <div className="min-h-[100px] p-4 bg-card rounded-xl border border-border">
                {correctedText ? (
                  <p className="font-mono text-sm whitespace-pre-wrap">{correctedText}</p>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {isAiProcessing
                      ? "AI is correcting spelling and errors..."
                      : "Corrected text will appear here"}
                  </p>
                )}
              </div>
            </div>

            {/* Translation */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Languages className="w-5 h-5 text-neon-purple" />
                  Translation
                  {isAiProcessing && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                </h3>
                {translatedText && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(translatedText)}
                    className="gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </Button>
                )}
              </div>

              {/* Language selection */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {languages.map((lang) => (
                  <Button
                    key={lang.code}
                    variant={selectedLang === lang.code ? "default" : "outline"}
                    size="sm"
                    onClick={() => changeLanguage(lang.code)}
                    className="gap-2"
                    disabled={isAiProcessing}
                  >
                    <span>{lang.flag}</span>
                    <span className="hidden sm:inline">{lang.name}</span>
                  </Button>
                ))}
              </div>

              <div className="min-h-[120px] p-4 bg-card rounded-xl border border-border">
                {translatedText ? (
                  <p className="font-mono text-sm whitespace-pre-wrap">{translatedText}</p>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {isAiProcessing 
                      ? "AI is translating..." 
                      : "Translation will appear here after text extraction"}
                  </p>
                )}
              </div>
            </div>

            {/* Tips */}
            <div className="glass-card rounded-2xl p-6">
              <h4 className="font-medium mb-3">Tips for best results:</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Use <strong>printed text</strong> (typed, not handwritten)</li>
                <li>• Ensure <strong>good lighting</strong> without glare</li>
                <li>• Hold camera <strong>steady and straight</strong></li>
                <li>• <strong>Larger text</strong> works better</li>
                <li>• <strong>High contrast</strong> (dark text on light background)</li>
                <li>• Select correct <strong>OCR language</strong> in settings</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
