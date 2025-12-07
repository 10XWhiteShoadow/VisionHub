import { useState, useRef, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { WebcamView, WebcamViewRef } from "@/components/WebcamView";
import { StatsDisplay } from "@/components/StatsDisplay";
import { LoadingState } from "@/components/LoadingState";
import { Button } from "@/components/ui/button";
import { FileText, Camera, Copy, Download, RefreshCw, Languages } from "lucide-react";
import Tesseract from "tesseract.js";

// Simple translation function (simulated - in real app, would use translation API)
const translations: Record<string, Record<string, string>> = {
  hello: { es: "hola", fr: "bonjour", de: "hallo", ja: "こんにちは" },
  world: { es: "mundo", fr: "monde", de: "welt", ja: "世界" },
  text: { es: "texto", fr: "texte", de: "text", ja: "テキスト" },
};

const languages = [
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
];

/**
 * OCR & Translation page
 * Uses Tesseract.js to extract text from images
 */
export default function OCR() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [selectedLang, setSelectedLang] = useState("es");
  const [confidence, setConfidence] = useState(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  
  const webcamRef = useRef<WebcamViewRef>(null);

  // Capture image from webcam
  const captureImage = useCallback(() => {
    const screenshot = webcamRef.current?.capture();
    if (screenshot) {
      setCapturedImage(screenshot);
      processImage(screenshot);
    }
  }, []);

  // Process image with Tesseract OCR
  const processImage = async (imageData: string) => {
    setIsProcessing(true);
    setProgress(0);
    setExtractedText("");
    setTranslatedText("");

    try {
      const result = await Tesseract.recognize(imageData, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const text = result.data.text.trim();
      setExtractedText(text);
      setConfidence(Math.round(result.data.confidence));
      
      // Simple word-by-word translation demo
      if (text) {
        const words = text.toLowerCase().split(/\s+/);
        const translated = words.map((word) => {
          const clean = word.replace(/[^a-z]/g, "");
          return translations[clean]?.[selectedLang] || word;
        }).join(" ");
        setTranslatedText(translated);
      }
    } catch (err) {
      console.error("OCR error:", err);
      setExtractedText("Error processing image. Try again with clearer text.");
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  // Copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Retake photo
  const retake = () => {
    setCapturedImage(null);
    setExtractedText("");
    setTranslatedText("");
    setConfidence(0);
  };

  // Change translation language
  const changeLanguage = (lang: string) => {
    setSelectedLang(lang);
    if (extractedText) {
      const words = extractedText.toLowerCase().split(/\s+/);
      const translated = words.map((word) => {
        const clean = word.replace(/[^a-z]/g, "");
        return translations[clean]?.[lang] || word;
      }).join(" ");
      setTranslatedText(translated);
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
              Extract text from images and translate to different languages
            </p>
          </div>
        </div>

        {extractedText && <StatsDisplay stats={stats} className="mb-6" />}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Camera / Captured image */}
          <div className="glass-card rounded-2xl p-4">
            {!capturedImage ? (
              <>
                <WebcamView ref={webcamRef} mirrored={false} />
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
                    src={capturedImage}
                    alt="Captured"
                    className="w-full aspect-video object-cover"
                  />
                  {isProcessing && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur flex flex-col items-center justify-center">
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
                <Button
                  variant="outline"
                  className="w-full mt-4 gap-2"
                  onClick={retake}
                >
                  <RefreshCw className="w-4 h-4" />
                  Capture New Image
                </Button>
              </>
            )}
          </div>

          {/* Results panel */}
          <div className="space-y-6">
            {/* Extracted text */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-neon-cyan" />
                  Extracted Text
                </h3>
                {extractedText && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(extractedText)}
                    className="gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </Button>
                )}
              </div>
              <div className="min-h-[120px] p-4 bg-card rounded-xl border border-border">
                {extractedText ? (
                  <p className="font-mono text-sm whitespace-pre-wrap">{extractedText}</p>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {isProcessing
                      ? "Extracting text from image..."
                      : "Capture an image with text to extract it"}
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
                    Translation will appear here after text extraction
                  </p>
                )}
              </div>
            </div>

            {/* Tips */}
            <div className="glass-card rounded-2xl p-6">
              <h4 className="font-medium mb-3">Tips for best results:</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Use clear, high-contrast text</li>
                <li>• Avoid glare and shadows</li>
                <li>• Hold camera steady when capturing</li>
                <li>• Printed text works better than handwriting</li>
                <li>• Larger text is easier to recognize</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
