import { useState, useRef, useCallback, useEffect } from 'react';
import { downsampleBuffer } from '../utils/audioProcessor';

export function useAudioRecorder(onAudioData: (audio: Float32Array) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const onAudioDataRef = useRef(onAudioData);
  const workletReadyRef = useRef(false);
  /** Tracks whether we're using AudioWorklet (true) or ScriptProcessor (false). */
  const usingWorkletRef = useRef(false);
  onAudioDataRef.current = onAudioData;

  // Clean up AudioContext on unmount — this is the ONLY place we close() it
  useEffect(() => {
    return () => {
      // Disconnect any active nodes
      if (workletNodeRef.current) {
        workletNodeRef.current.disconnect();
        workletNodeRef.current = null;
      }
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
      workletReadyRef.current = false;
    };
  }, []);

  /**
   * Try to set up AudioWorkletNode for off-main-thread downsampling.
   * Returns true on success, false if unsupported or failed (caller should fall back).
   */
  const tryAudioWorklet = useCallback(async (
    ctx: AudioContext,
    source: MediaStreamAudioSourceNode
  ): Promise<boolean> => {
    try {
      if (typeof ctx.audioWorklet?.addModule !== 'function') {
        return false;
      }

      // Only register the worklet module once per AudioContext lifetime
      if (!workletReadyRef.current) {
        // Build the worklet processor URL from Vite's import.meta
        const workletUrl = new URL(
          '../workers/audio-worklet-processor.ts',
          import.meta.url
        ).href;

        await ctx.audioWorklet.addModule(workletUrl);
        workletReadyRef.current = true;
      }

      const workletNode = new AudioWorkletNode(ctx, 'downsampler-processor');
      workletNodeRef.current = workletNode;

      workletNode.port.onmessage = (e: MessageEvent) => {
        if (e.data?.audio) {
          onAudioDataRef.current(e.data.audio);
        }
      };

      source.connect(workletNode);
      workletNode.connect(ctx.destination);

      usingWorkletRef.current = true;
      console.log('Audio: Using AudioWorkletNode (off-main-thread downsampling)');
      return true;
    } catch (err) {
      console.warn('Audio: AudioWorklet setup failed, will fall back to ScriptProcessor:', err);
      return false;
    }
  }, []);

  /**
   * Fall back to ScriptProcessorNode (deprecated but universally supported).
   * Runs the downsampling callback on the main thread.
   */
  const setupScriptProcessor = useCallback((
    ctx: AudioContext,
    source: MediaStreamAudioSourceNode
  ): void => {
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      const inputBuffer = e.inputBuffer.getChannelData(0);
      const currentSampleRate = ctx.sampleRate;

      // Downsample the buffer to 16kHz
      const downsampled = downsampleBuffer(inputBuffer, currentSampleRate, 16000);

      if (downsampled.length > 0) {
        onAudioDataRef.current(downsampled);
      }
    };

    source.connect(processor);
    processor.connect(ctx.destination);

    usingWorkletRef.current = false;
    console.log('Audio: Using ScriptProcessorNode (main-thread fallback)');
  }, []);

  /**
   * Disconnect processing nodes (worklet/script processor + source) but keep
   * the MediaStream and AudioContext alive so they can be reconnected cheaply.
   */
  const disconnectProcessingNodes = useCallback(() => {
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
  }, []);

  /**
   * Reconnect processing nodes to an existing (already-acquired) MediaStream.
   * Creates a new source node and hooks up the worklet or script processor.
   */
  const reconnectProcessingNodes = useCallback(async (
    ctx: AudioContext,
    stream: MediaStream
  ): Promise<void> => {
    const source = ctx.createMediaStreamSource(stream);
    sourceRef.current = source;

    // Re-use whichever processing path was established on first connect
    if (usingWorkletRef.current) {
      const ok = await tryAudioWorklet(ctx, source);
      if (!ok) {
        setupScriptProcessor(ctx, source);
      }
    } else {
      setupScriptProcessor(ctx, source);
    }
  }, [tryAudioWorklet, setupScriptProcessor]);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      let ctx = audioContextRef.current;

      // Reuse the existing AudioContext if we have one — just resume it
      if (ctx && ctx.state !== 'closed') {
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
      } else {
        // First time: create the AudioContext on the user click interaction context
        const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) {
          throw new Error('Web Audio API is not supported in this browser');
        }
        ctx = new AudioContextClass({
          sampleRate: 16000, // Request 16kHz from browser, but verify and downsample if not respected
        });

        // Auto-resume if suspended (Safari/iOS requirement)
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        audioContextRef.current = ctx;
        workletReadyRef.current = false;
      }

      // ── Reuse existing MediaStream if available ──
      const existingStream = streamRef.current;
      const existingTrack = existingStream?.getAudioTracks()[0];
      const streamStillAlive = existingTrack && existingTrack.readyState === 'live';

      if (streamStillAlive && existingStream) {
        // Re-enable the muted track and reconnect processing nodes
        existingTrack.enabled = true;
        await reconnectProcessingNodes(ctx, existingStream);
      } else {
        // First time or stream was released — acquire a new one
        if (existingStream) {
          existingStream.getTracks().forEach((t) => t.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        streamRef.current = stream;

        // Connect microphone to source node
        const source = ctx.createMediaStreamSource(stream);
        sourceRef.current = source;

        // Try AudioWorkletNode first, fall back to ScriptProcessorNode
        const workletSuccess = await tryAudioWorklet(ctx, source);
        if (!workletSuccess) {
          setupScriptProcessor(ctx, source);
        }
      }

      setIsRecording(true);
    } catch (err) {
      console.error('Audio recorder start error:', err);
      const errMsg = err instanceof Error ? err.message : 'Could not access microphone.';
      setError(errMsg);
      setIsRecording(false);

      // Clean up any partially-created resources from this failed attempt
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      // Suspend (not close) the context so it can be retried
      if (audioContextRef.current && audioContextRef.current.state === 'running') {
        audioContextRef.current.suspend().catch(() => {});
      }
    }
  }, [tryAudioWorklet, setupScriptProcessor, reconnectProcessingNodes]);

  const stopRecording = useCallback(() => {
    // Disconnect processing nodes but keep AudioContext AND MediaStream alive.
    // Mute the track so the mic indicator goes away, but the OS-level audio
    // session stays open — avoids expensive teardown/re-acquisition on iPad.
    disconnectProcessingNodes();

    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
      // Do NOT call track.stop() — keep the stream alive for reuse
    }

    // Suspend the context instead of closing it — we'll resume() on the next sentence
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      audioContextRef.current.suspend().catch(() => {});
    }

    setIsRecording(false);
  }, [disconnectProcessingNodes]);

  const preInitialize = useCallback(async () => {
    try {
      let ctx = audioContextRef.current;
      if (!ctx || ctx.state === 'closed') {
        const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) {
          throw new Error('Web Audio API is not supported in this browser');
        }
        ctx = new AudioContextClass({
          sampleRate: 16000,
        });
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        audioContextRef.current = ctx;
        workletReadyRef.current = false;
      }
    } catch (err) {
      console.warn('AudioContext pre-initialization failed:', err);
    }
  }, []);

  return {
    isRecording,
    error,
    startRecording,
    stopRecording,
    preInitialize,
  };
}

