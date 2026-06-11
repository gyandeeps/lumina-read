/**
 * Type declarations for the AudioWorkletGlobalScope.
 * These globals are available inside AudioWorklet processor modules
 * but are not part of the standard DOM lib types.
 */

/** The current sample rate of the AudioContext that owns this worklet. */
declare const sampleRate: number;
/** The current frame count, incremented by the render quantum (128 frames). */
declare const currentFrame: number;
/** The current time in seconds, derived from currentFrame / sampleRate. */
declare const currentTime: number;

declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor();
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
}

declare function registerProcessor(
  name: string,
  processorCtor: new () => AudioWorkletProcessor
): void;
