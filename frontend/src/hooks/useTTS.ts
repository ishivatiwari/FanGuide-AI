/**
 * FanGuide AI — Text-to-Speech Hook
 *
 * Wraps the Web Speech API for reading assistant messages aloud.
 * Returns a speak() function and cancel() function.
 */

import { useCallback, useRef } from 'react';

interface UseTTSReturn {
  speak: (text: string, lang?: string) => void;
  cancel: () => void;
  isSupported: boolean;
}

export function useTTS(): UseTTSReturn {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isSupported = 'speechSynthesis' in window;

  const speak = useCallback((text: string, lang = 'en') => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isSupported]);

  const cancel = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
  }, [isSupported]);

  return { speak, cancel, isSupported };
}
