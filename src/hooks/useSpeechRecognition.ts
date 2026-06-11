import { useState, useEffect, useRef, useCallback } from 'react';
import { useAudioRecorder } from './useAudioRecorder';

export type SpeechStatus = 'idle' | 'loading' | 'ready' | 'listening' | 'error';

export interface WhisperWordChunk {
  text: string;
  timestamp: [number, number];
}

export interface WhisperProgress {
  loaded: number;
  total: number;
}

export function useSpeechRecognition() {
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [words, setWords] = useState<WhisperWordChunk[]>([]);
  const [fileProgress, setFileProgress] = useState<Record<string, WhisperProgress>>({});

  const workerRef = useRef<Worker | null>(null);
  const accumulatedAudioRef = useRef<Float32Array>(new Float32Array(0));
  const isProcessingRef = useRef<boolean>(false);
  const pendingProcessRef = useRef<boolean>(false);
  const intervalRef = useRef<any>(null);

  // Clean up worker and interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  // Function to send the accumulated audio to the worker
  const triggerProcessing = useCallback(() => {
    if (isProcessingRef.current) {
      pendingProcessRef.current = true;
      return;
    }

    const audioBuffer = accumulatedAudioRef.current;
    if (audioBuffer.length === 0) return;

    isProcessingRef.current = true;
    pendingProcessRef.current = false;

    workerRef.current?.postMessage({
      type: 'process',
      audio: audioBuffer,
    });
  }, []);

  // Receive audio data from the recorder
  const handleAudioData = useCallback((incomingData: Float32Array) => {
    const current = accumulatedAudioRef.current;
    const next = new Float32Array(current.length + incomingData.length);
    next.set(current);
    next.set(incomingData, current.length);
    accumulatedAudioRef.current = next;
  }, []);

  const recorder = useAudioRecorder(handleAudioData);

  // Initialize the Whisper Model Worker
  const initModel = useCallback(() => {
    if (workerRef.current) return;

    setStatus('loading');
    setError(null);
    setFileProgress({});

    try {
      const wasmPaths = new URL(`${import.meta.env.BASE_URL}wasm/`, window.location.href).href;
      const worker = new Worker(
        new URL('../workers/whisper.worker.ts', import.meta.url),
        { type: 'module' }
      );
      workerRef.current = worker;

      worker.onmessage = (event: MessageEvent) => {
        const { status: msgStatus, file, loaded, total, data, message } = event.data;

        if (msgStatus === 'progress') {
          setFileProgress((prev) => ({
            ...prev,
            [file]: { loaded, total },
          }));
        } else if (msgStatus === 'ready') {
          setStatus('ready');
          setFileProgress({});
        } else if (msgStatus === 'result') {
          isProcessingRef.current = false;
          if (data) {
            setTranscript(data.text || '');
            setWords(data.chunks || []);
          }

          // If more audio was recorded during worker run, trigger another transcription immediately
          if (pendingProcessRef.current) {
            triggerProcessing();
          }
        } else if (msgStatus === 'error') {
          isProcessingRef.current = false;
          setStatus('error');
          setError(message || 'An error occurred in the transcription worker.');
        }
      };

      worker.postMessage({ type: 'init', wasmPaths });
    } catch (err: any) {
      console.error('Failed to initialize Whisper worker:', err);
      setStatus('error');
      setError(err.message || 'Failed to instantiate Web Worker.');
    }
  }, [triggerProcessing]);

  // Start capturing audio and running periodic Whisper inference
  const startListening = useCallback(async () => {
    if (status !== 'ready') return;

    accumulatedAudioRef.current = new Float32Array(0);
    setTranscript('');
    setWords([]);
    setError(null);
    setStatus('listening');

    try {
      await recorder.startRecording();

      // Trigger Whisper transcription every 1.5 seconds on the accumulated stream
      intervalRef.current = setInterval(() => {
        triggerProcessing();
      }, 1500);
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setStatus('ready');
      setError(err.message || 'Microphone recording could not start.');
    }
  }, [status, recorder, triggerProcessing]);

  // Stop capturing audio and do one final transcription run
  const stopListening = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    recorder.stopRecording();
    setStatus('ready');

    // Run a final time to parse the absolute end of speech
    triggerProcessing();
  }, [recorder, triggerProcessing]);

  // Reset transcript and audio buffers manually
  const resetTranscript = useCallback(() => {
    accumulatedAudioRef.current = new Float32Array(0);
    setTranscript('');
    setWords([]);
    isProcessingRef.current = false;
    pendingProcessRef.current = false;
  }, []);

  // Calculate global model loading progress (since multiple files download concurrently)
  const getLoadingPercentage = useCallback(() => {
    const progressItems = Object.values(fileProgress);
    if (progressItems.length === 0) return 0;

    let totalLoaded = 0;
    let totalSize = 0;

    for (const item of progressItems) {
      totalLoaded += item.loaded || 0;
      totalSize += item.total || 0;
    }

    return totalSize > 0 ? Math.round((totalLoaded / totalSize) * 100) : 0;
  }, [fileProgress]);

  return {
    status,
    error,
    transcript,
    words,
    initModel,
    startListening,
    stopListening,
    resetTranscript,
    loadingProgress: getLoadingPercentage(),
    isRecording: recorder.isRecording,
    micError: recorder.error,
  };
}
