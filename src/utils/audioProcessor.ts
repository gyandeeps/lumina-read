/**
 * Downsamples a Float32Array audio buffer to the target sample rate (default 16000 Hz).
 * Uses a moving average window corresponding to the sample rate ratio.
 */
export function downsampleBuffer(
  buffer: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number = 16000
): Float32Array {
  if (inputSampleRate === outputSampleRate) {
    return new Float32Array(buffer); // return a copy
  }
  
  if (inputSampleRate < outputSampleRate) {
    console.warn(`Input sample rate (${inputSampleRate}Hz) is lower than target (${outputSampleRate}Hz). Skipping downsampling.`);
    return new Float32Array(buffer);
  }

  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;
    
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }

  return result;
}

/**
 * A growable buffer for efficiently accumulating Float32 audio samples.
 * Pre-allocates capacity and only reallocates (doubling) when exceeded.
 * Supports extracting a trailing window of the last N samples for sliding-window inference.
 */
export class GrowableAudioBuffer {
  private buffer: Float32Array;
  private length: number;

  constructor(initialCapacity: number = 480_000) {
    // Default 30s at 16kHz
    this.buffer = new Float32Array(initialCapacity);
    this.length = 0;
  }

  /** Append a chunk of audio samples. O(1) amortized. */
  append(chunk: Float32Array): void {
    const needed = this.length + chunk.length;
    if (needed > this.buffer.length) {
      // Double capacity until it fits
      let newCapacity = this.buffer.length * 2;
      while (newCapacity < needed) {
        newCapacity *= 2;
      }
      const newBuffer = new Float32Array(newCapacity);
      newBuffer.set(this.buffer.subarray(0, this.length));
      this.buffer = newBuffer;
    }
    this.buffer.set(chunk, this.length);
    this.length += chunk.length;
  }

  /** Get the last N samples as a new Float32Array. Returns fewer if buffer is shorter. */
  getLastNSamples(n: number): Float32Array {
    const start = Math.max(0, this.length - n);
    return this.buffer.slice(start, this.length);
  }

  /** Get all accumulated samples as a new Float32Array. */
  getAll(): Float32Array {
    return this.buffer.slice(0, this.length);
  }

  /** Total number of samples currently stored. */
  get size(): number {
    return this.length;
  }

  /** Clear the buffer, resetting length to 0 without deallocating. */
  clear(): void {
    this.length = 0;
  }
}
