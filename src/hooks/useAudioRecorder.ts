import { useState, useRef, useCallback } from 'react';
import { downsampleBuffer } from '../utils/audioProcessor';

export function useAudioRecorder(onAudioData: (audio: Float32Array) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      // 1. Initialize AudioContext on the user click interaction context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass({
        sampleRate: 16000, // Request 16kHz from browser, but verify and downsample if not respected
      });
      
      // Auto-resume if suspended (Safari/iOS requirement)
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      audioContextRef.current = ctx;

      // 2. Request microphone access with filters for speech
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // 3. Connect microphone to source node
      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      // 4. Create ScriptProcessorNode for universal browser/iPad compatibility
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputBuffer = e.inputBuffer.getChannelData(0);
        const currentSampleRate = ctx.sampleRate;
        
        // Downsample the buffer to 16kHz
        const downsampled = downsampleBuffer(inputBuffer, currentSampleRate, 16000);
        
        if (downsampled.length > 0) {
          onAudioData(downsampled);
        }
      };

      source.connect(processor);
      processor.connect(ctx.destination);

      setIsRecording(true);
    } catch (err: any) {
      console.error('Audio recorder start error:', err);
      setError(err.message || 'Could not access microphone.');
      setIsRecording(false);
      
      // Cleanup on error
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    }
  }, [onAudioData]);

  const stopRecording = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      audioContextRef.current = null;
    }
    setIsRecording(false);
  }, []);

  return {
    isRecording,
    error,
    startRecording,
    stopRecording,
  };
}
