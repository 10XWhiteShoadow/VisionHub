import { useCallback, useState, useEffect } from "react";

export const useVoiceAnnouncement = () => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);
      
      // Prefer English voices, especially female ones for clarity
      const preferredVoice = availableVoices.find(
        (v) => v.lang.startsWith("en") && v.name.includes("Female")
      ) || availableVoices.find(
        (v) => v.lang.startsWith("en")
      ) || availableVoices[0];
      
      setSelectedVoice(preferredVoice || null);
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const announce = useCallback((studentName: string) => {
    if (!isEnabled || !("speechSynthesis" in window)) return;

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(
      `${studentName}, present`
    );

    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speechSynthesis.speak(utterance);
  }, [isEnabled, selectedVoice]);

  const toggle = useCallback(() => {
    setIsEnabled((prev) => !prev);
  }, []);

  return {
    isEnabled,
    isSpeaking,
    voices,
    selectedVoice,
    setSelectedVoice,
    announce,
    toggle,
  };
};
