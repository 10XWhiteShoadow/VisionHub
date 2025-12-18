import { useState, useRef, useCallback, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { WebcamView, WebcamViewRef } from "@/components/WebcamView";
import { StatsDisplay } from "@/components/StatsDisplay";
import { Button } from "@/components/ui/button";
import { FileText, Camera, Copy, RefreshCw, Languages, Settings, Loader2 } from "lucide-react";
import Tesseract from "tesseract.js";

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
  const [extractedText, setExtractedText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [selectedLang, setSelectedLang] = useState("es");
  const [ocrLang, setOcrLang] = useState("eng");
  const [confidence, setConfidence] = useState(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  
  const webcamRef = useRef<WebcamViewRef>(null);
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

  // Preprocess image for better OCR
  const preprocessImage = useCallback((imageData: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(imageData);
          return;
        }

        // Scale up for better recognition
        const scale = 2;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        // Draw scaled image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Get image data for processing
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        
        // Convert to grayscale and increase contrast
        for (let i = 0; i < data.length; i += 4) {
          // Grayscale
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          
          // Increase contrast with threshold
          const threshold = 128;
          const contrast = 1.5;
          const adjusted = ((gray - threshold) * contrast) + threshold;
          const final = Math.max(0, Math.min(255, adjusted));
          
          // Apply binarization for cleaner text
          const binary = final > 140 ? 255 : 0;
          
          data[i] = binary;
          data[i + 1] = binary;
          data[i + 2] = binary;
        }
        
        ctx.putImageData(imgData, 0, 0);
        
        // Apply sharpening
        ctx.filter = "contrast(1.2) brightness(1.1)";
        ctx.drawImage(canvas, 0, 0);
        
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = imageData;
    });
  }, []);

  // Capture image from webcam
  const captureImage = useCallback(async () => {
    const screenshot = webcamRef.current?.capture();
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
      
      // Translate if text found
      if (text) {
        translateText(text, selectedLang);
      }
    } catch (err) {
      console.error("OCR error:", err);
      setExtractedText("Error processing image. Try again with clearer text.");
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  // Simple translation using dictionary + pattern matching
  const translateText = async (text: string, targetLang: string) => {
    // Basic translation dictionary
    const translations: Record<string, Record<string, string>> = {
      // Common words
      "hello": { es: "hola", fr: "bonjour", de: "hallo", ja: "こんにちは", zh: "你好", hi: "नमस्ते" },
      "world": { es: "mundo", fr: "monde", de: "welt", ja: "世界", zh: "世界", hi: "दुनिया" },
      "the": { es: "el", fr: "le", de: "der", ja: "", zh: "", hi: "" },
      "is": { es: "es", fr: "est", de: "ist", ja: "です", zh: "是", hi: "है" },
      "a": { es: "un", fr: "un", de: "ein", ja: "", zh: "", hi: "एक" },
      "and": { es: "y", fr: "et", de: "und", ja: "と", zh: "和", hi: "और" },
      "to": { es: "a", fr: "à", de: "zu", ja: "へ", zh: "到", hi: "को" },
      "of": { es: "de", fr: "de", de: "von", ja: "の", zh: "的", hi: "का" },
      "in": { es: "en", fr: "dans", de: "in", ja: "で", zh: "在", hi: "में" },
      "for": { es: "para", fr: "pour", de: "für", ja: "のために", zh: "为", hi: "के लिए" },
      "you": { es: "tú", fr: "tu", de: "du", ja: "あなた", zh: "你", hi: "आप" },
      "i": { es: "yo", fr: "je", de: "ich", ja: "私", zh: "我", hi: "मैं" },
      "this": { es: "esto", fr: "ceci", de: "dies", ja: "これ", zh: "这", hi: "यह" },
      "that": { es: "eso", fr: "cela", de: "das", ja: "それ", zh: "那", hi: "वह" },
      "good": { es: "bueno", fr: "bon", de: "gut", ja: "良い", zh: "好", hi: "अच्छा" },
      "thank": { es: "gracias", fr: "merci", de: "danke", ja: "ありがとう", zh: "谢谢", hi: "धन्यवाद" },
      "please": { es: "por favor", fr: "s'il vous plaît", de: "bitte", ja: "お願いします", zh: "请", hi: "कृपया" },
      "yes": { es: "sí", fr: "oui", de: "ja", ja: "はい", zh: "是", hi: "हाँ" },
      "no": { es: "no", fr: "non", de: "nein", ja: "いいえ", zh: "不", hi: "नहीं" },
      "welcome": { es: "bienvenido", fr: "bienvenue", de: "willkommen", ja: "ようこそ", zh: "欢迎", hi: "स्वागत" },
      "text": { es: "texto", fr: "texte", de: "text", ja: "テキスト", zh: "文本", hi: "पाठ" },
      "image": { es: "imagen", fr: "image", de: "bild", ja: "画像", zh: "图片", hi: "छवि" },
      "camera": { es: "cámara", fr: "caméra", de: "kamera", ja: "カメラ", zh: "相机", hi: "कैमरा" },
      "scan": { es: "escanear", fr: "scanner", de: "scannen", ja: "スキャン", zh: "扫描", hi: "स्कैन" },
      "read": { es: "leer", fr: "lire", de: "lesen", ja: "読む", zh: "读", hi: "पढ़ना" },
      "write": { es: "escribir", fr: "écrire", de: "schreiben", ja: "書く", zh: "写", hi: "लिखना" },
    };

    const words = text.toLowerCase().split(/\s+/);
    const translated = words.map((word) => {
      const clean = word.replace(/[^a-z]/gi, "");
      const translation = translations[clean]?.[targetLang];
      if (translation) {
        // Preserve original punctuation
        const prefix = word.match(/^[^a-z]*/i)?.[0] || "";
        const suffix = word.match(/[^a-z]*$/i)?.[0] || "";
        return prefix + translation + suffix;
      }
      return word;
    }).join(" ");
    
    setTranslatedText(translated);
  };

  // Copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Retake photo
  const retake = () => {
    setCapturedImage(null);
    setProcessedImage(null);
    setExtractedText("");
    setTranslatedText("");
    setConfidence(0);
  };

  // Change translation language
  const changeLanguage = (lang: string) => {
    setSelectedLang(lang);
    if (extractedText) {
      translateText(extractedText, lang);
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
