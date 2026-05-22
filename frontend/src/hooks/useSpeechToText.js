import { useState, useCallback, useRef } from 'react';

const useSpeechToText = (lang = 'en-US') => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  // Check if browser supports Web Speech API SpeechRecognition
  const SpeechRecognition = typeof window !== 'undefined' && 
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  const isSupported = !!SpeechRecognition;

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Web Speech API is not supported in this browser.');
      return;
    }

    try {
      setIsListening(true);
      setError(null);
      setTranscript('');

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = true; // Keep listening until explicitly stopped
      recognition.interimResults = true; // Enable real-time interim results
      recognition.lang = lang;

      recognition.onresult = (event) => {
        if (event.results) {
          let fullTranscript = '';
          for (let i = 0; i < event.results.length; ++i) {
            if (event.results[i] && event.results[i][0]) {
              fullTranscript += event.results[i][0].transcript;
            }
          }
          setTranscript(fullTranscript);
        }
      };

      recognition.onerror = (event) => {
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      setError(`Failed to start speech recognition: ${err.message}`);
      setIsListening(false);
    }
  }, [isSupported, SpeechRecognition, lang]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors on stopping
      }
    }
    setIsListening(false);
  }, []);

  return {
    isListening,
    error,
    transcript,
    isSupported,
    startListening,
    stopListening
  };
};

export default useSpeechToText;