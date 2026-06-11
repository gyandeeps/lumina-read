import { useState, useEffect, useRef, useCallback } from 'react';
import { useAudioRecorder } from './useAudioRecorder';
import { GrowableAudioBuffer } from '../utils/audioProcessor';

export type SpeechStatus = 'idle' | 'loading' | 'ready' | 'listening' | 'error';

export interface WhisperWordChunk {
  text: string;
  timestamp: [number, number];
}

export interface WhisperProgress {
  loaded: number;
  total: number;
}

/**
 * Sliding window size in samples (5 seconds at 16kHz).
 * Only the most recent 5s of audio is sent to Whisper per inference cycle,
 * dramatically reducing latency as the recording grows.
 */
const WINDOW_SAMPLES = 16000 * 5;

/**
 * Delay (ms) between receiving a result and scheduling the next inference.
 * This self-scheduling loop adapts to actual inference speed instead of
 * using a fixed polling interval.
 */
const RESCHEDULE_DELAY_MS = 300;

export function useSpeechRecognition() {
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const statusRef = useRef<SpeechStatus>('idle');

  const setSpeechStatus = useCallback((newStatus: SpeechStatus) => {
    statusRef.current = newStatus;
    setStatus(newStatus);
  }, []);

  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [words, setWords] = useState<WhisperWordChunk[]>([]);
  const [fileProgress, setFileProgress] = useState<Record<string, WhisperProgress>>({});

  const workerRef = useRef<Worker | null>(null);
  const audioBufferRef = useRef<GrowableAudioBuffer>(new GrowableAudioBuffer());
  const isProcessingRef = useRef<boolean>(false);
  const pendingProcessRef = useRef<boolean>(false);
  const rescheduleTimerRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const sessionIdRef = useRef<number>(0);

  // Clean up worker and timers on unmount
  useEffect(() => {
    return () => {
      if (rescheduleTimerRef.current) {
        clearTimeout(rescheduleTimerRef.current);
      }
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  // Function to send a sliding window of audio to the worker
  const triggerProcessing = useCallback(() => {
    if (isProcessingRef.current) {
      pendingProcessRef.current = true;
      return;
    }

    const buffer = audioBufferRef.current;
    if (buffer.size === 0) return;

    isProcessingRef.current = true;
    pendingProcessRef.current = false;

    // Extract only the last WINDOW_SAMPLES (5s) of audio
    const windowData = buffer.getLastNSamples(WINDOW_SAMPLES);

    // Transfer the buffer to the worker (zero-copy)
    workerRef.current?.postMessage(
      { type: 'process', audio: windowData, sessionId: sessionIdRef.current },
      [windowData.buffer]
    );
  }, []);

  /**
   * Self-scheduling loop: after each result, wait RESCHEDULE_DELAY_MS then
   * trigger the next inference. This adapts to actual inference speed.
   */
  const scheduleNextProcessing = useCallback(() => {
    if (!isListeningRef.current) return;

    rescheduleTimerRef.current = setTimeout(() => {
      rescheduleTimerRef.current = null;
      if (isListeningRef.current) {
        triggerProcessing();
      }
    }, RESCHEDULE_DELAY_MS);
  }, [triggerProcessing]);

  // Receive audio data from the recorder — append to the growable buffer
  const handleAudioData = useCallback((incomingData: Float32Array) => {
    audioBufferRef.current.append(incomingData);
  }, []);

  const recorder = useAudioRecorder(handleAudioData);

  // Initialize the Whisper Model Worker
  const initModel = useCallback(() => {
    if (workerRef.current) return;

    setSpeechStatus('loading');
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
        const { status: msgStatus, file, loaded, total, data, message, sessionId } = event.data;

        if (msgStatus === 'progress') {
          setFileProgress((prev) => ({
            ...prev,
            [file]: { loaded, total },
          }));
        } else if (msgStatus === 'ready') {
          setSpeechStatus('ready');
          setFileProgress({});
        } else if (msgStatus === 'result') {
          if (sessionId !== undefined && sessionId !== sessionIdRef.current) {
            console.log(`Ignoring worker result for stale session: received ${sessionId}, current ${sessionIdRef.current}`);
            return;
          }
          isProcessingRef.current = false;
          if (data) {
            setTranscript(data.text || '');
            setWords(data.chunks || []);
          }

          // If more audio was recorded during worker run, process immediately;
          // otherwise schedule the next run after a short delay.
          if (pendingProcessRef.current) {
            triggerProcessing();
          } else {
            scheduleNextProcessing();
          }
        } else if (msgStatus === 'error') {
          if (sessionId !== undefined && sessionId !== sessionIdRef.current) {
            return;
          }
          isProcessingRef.current = false;
          setSpeechStatus('error');
          setError(message || 'An error occurred in the transcription worker.');
        }
      };

      worker.postMessage({ type: 'init', wasmPaths });
    } catch (err: any) {
      console.error('Failed to initialize Whisper worker:', err);
      setSpeechStatus('error');
      setError(err.message || 'Failed to instantiate Web Worker.');
    }
  }, [triggerProcessing, scheduleNextProcessing]);

  // Start capturing audio and running adaptive Whisper inference
  const startListening = useCallback(async () => {
    if (statusRef.current !== 'ready') return;

    sessionIdRef.current += 1;
    audioBufferRef.current.clear();
    setTranscript('');
    setWords([]);
    setError(null);
    setSpeechStatus('listening');
    isListeningRef.current = true;

    try {
      await recorder.startRecording();

      // Kick off the first inference after a short initial delay to
      // accumulate a small buffer of audio first
      rescheduleTimerRef.current = setTimeout(() => {
        rescheduleTimerRef.current = null;
        triggerProcessing();
      }, 800);
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setSpeechStatus('ready');
      isListeningRef.current = false;
      setError(err.message || 'Microphone recording could not start.');
    }
  }, [recorder, triggerProcessing]);

  // Stop capturing audio and do one final transcription run
  const stopListening = useCallback(() => {
    isListeningRef.current = false;

    if (rescheduleTimerRef.current) {
      clearTimeout(rescheduleTimerRef.current);
      rescheduleTimerRef.current = null;
    }

    recorder.stopRecording();
    setSpeechStatus('ready');

    // Run a final time to parse the absolute end of speech
    triggerProcessing();
  }, [recorder, triggerProcessing]);

  // Reset transcript and audio buffers manually
  const resetTranscript = useCallback(() => {
    sessionIdRef.current += 1;
    audioBufferRef.current.clear();
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
