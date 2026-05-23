import { useState, useCallback, useRef } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const useSpeechToText = (lang = 'en-US') => {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState(null);
  const [transcript, setTranscript] = useState('');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  // MediaRecorder is widely supported in all modern browsers
  const isSupported = typeof window !== 'undefined' && 
    !!navigator.mediaDevices?.getUserMedia && 
    !!window.MediaRecorder;

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // Ignore errors on stopping
      }
    }
    // Stop all audio tracks to release the microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError('Audio recording is not supported in this browser.');
      return;
    }

    try {
      setIsListening(true);
      setError(null);
      setTranscript('');
      chunksRef.current = [];

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 48000,
        } 
      });
      streamRef.current = stream;

      // Create MediaRecorder with webm/opus format
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4'; // Fallback for Safari

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks to release mic
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;

        if (chunksRef.current.length === 0) {
          setError('No audio data recorded.');
          return;
        }

        // Convert chunks to a single blob
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];

        // Convert blob to base64
        try {
          setIsTranscribing(true);

          const base64Audio = await blobToBase64(audioBlob);

          // Determine encoding format for Google Cloud STT
          const encoding = mimeType.includes('webm') ? 'WEBM_OPUS' : 'MP3';

          // Get auth token from localStorage
          const token = localStorage.getItem('token');
          if (!token) {
            setError('You must be logged in to use speech-to-text.');
            setIsTranscribing(false);
            return;
          }

          // Send to backend for transcription
          const response = await axios.post(
            `${API_URL}/speech/transcribe`,
            {
              audio: base64Audio,
              language: lang,
              encoding: encoding,
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              timeout: 30000, // 30 second timeout
            }
          );

          if (response.data && response.data.text) {
            setTranscript(response.data.text);
          } else {
            setTranscript('');
            setError('No speech detected. Please try again.');
          }
        } catch (err) {
          const errorMsg = err.response?.data?.error || err.message || 'Transcription failed';
          setError(`Transcription error: ${errorMsg}`);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.onerror = (event) => {
        setError(`Recording error: ${event.error?.message || 'Unknown error'}`);
        setIsListening(false);
      };

      // Start recording — collect data every second for smoother processing
      mediaRecorder.start(1000);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone permissions.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone.');
      } else {
        setError(`Failed to start recording: ${err.message}`);
      }
      setIsListening(false);
    }
  }, [isSupported, lang]);

  return {
    isListening,
    isTranscribing,
    error,
    transcript,
    isSupported,
    startListening,
    stopListening,
  };
};

/**
 * Convert a Blob to a base64 string (without the data URI prefix).
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // reader.result is "data:audio/webm;base64,AAAA..."
      // We need just the base64 part after the comma
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default useSpeechToText;