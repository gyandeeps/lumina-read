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
 * Maximum buffer capacity in samples.
 * 60 seconds at 16kHz = 960,000 samples (~3.6 MB).
 * Prevents unbounded memory growth during long reading sessions.
 */
const MAX_CAPACITY = 16000 * 60;

/**
 * A growable buffer for efficiently accumulating Float32 audio samples.
 * Pre-allocates capacity and only reallocates (doubling) when exceeded.
 * Supports extracting a trailing window of the last N samples for sliding-window inference.
 */
export class GrowableAudioBuffer {
  private buffer: Float32Array;
  private length: number;
  private readonly initialCapacity: number;
  /** Pre-allocated staging buffer for transfer-optimized extraction. */
  private stagingBuffer: Float32Array | null;

  constructor(initialCapacity: number = 480_000) {
    // Default 30s at 16kHz
    this.initialCapacity = initialCapacity;
    this.buffer = new Float32Array(initialCapacity);
    this.length = 0;
    this.stagingBuffer = null;
  }

  /** Append a chunk of audio samples. O(1) amortized. */
  append(chunk: Float32Array): void {
    const needed = this.length + chunk.length;
    if (needed > this.buffer.length) {
      // Double capacity until it fits, but respect the hard ceiling
      let newCapacity = this.buffer.length * 2;
      while (newCapacity < needed) {
        newCapacity *= 2;
      }
      newCapacity = Math.min(newCapacity, MAX_CAPACITY);

      // If we've hit the ceiling and still need more room, discard the
      // oldest samples so the newest audio always fits.
      if (needed > newCapacity) {
        const keep = newCapacity - chunk.length;
        if (keep > 0) {
          const newBuffer = new Float32Array(newCapacity);
          // Copy the tail of existing data
          newBuffer.set(this.buffer.subarray(this.length - keep, this.length));
          this.buffer = newBuffer;
          this.length = keep;
        } else {
          // Chunk alone exceeds capacity — just keep the chunk's tail
          this.buffer = new Float32Array(newCapacity);
          this.length = 0;
        }
      } else {
        const newBuffer = new Float32Array(newCapacity);
        newBuffer.set(this.buffer.subarray(0, this.length));
        this.buffer = newBuffer;
      }
    }
    this.buffer.set(chunk, this.length);
    this.length += chunk.length;
  }

  /** Get the last N samples as a new Float32Array. Returns fewer if buffer is shorter. */
  getLastNSamples(n: number): Float32Array {
    const start = Math.max(0, this.length - n);
    return this.buffer.slice(start, this.length);
  }

  /**
   * Get the last N samples into a reusable staging buffer.
   * The returned Float32Array is suitable for postMessage transferable.
   * After the buffer is transferred (detached), the next call will
   * re-allocate. This avoids creating a new 320KB allocation on every
   * 300ms inference cycle.
   */
  getLastNSamplesForTransfer(n: number): Float32Array {
    const sampleCount = Math.min(n, this.length);
    if (sampleCount === 0) return new Float32Array(0);

    const start = this.length - sampleCount;

    // Re-allocate staging buffer only if it was transferred (detached)
    // or if the size changed.
    if (
      !this.stagingBuffer ||
      this.stagingBuffer.byteLength === 0 ||       // detached after transfer
      this.stagingBuffer.length !== sampleCount
    ) {
      this.stagingBuffer = new Float32Array(sampleCount);
    }

    this.stagingBuffer.set(this.buffer.subarray(start, this.length));
    return this.stagingBuffer;
  }

  /** Get all accumulated samples as a new Float32Array. */
  getAll(): Float32Array {
    return this.buffer.slice(0, this.length);
  }

  /** Total number of samples currently stored. */
  get size(): number {
    return this.length;
  }

  /**
   * Clear the buffer and release memory back to the initial allocation size.
   * Previous implementation only reset the length counter, leaving potentially
   * massive (doubled many times) Float32Arrays in memory indefinitely.
   */
  clear(): void {
    this.length = 0;
    if (this.buffer.length > this.initialCapacity) {
      this.buffer = new Float32Array(this.initialCapacity);
    }
    this.stagingBuffer = null;
  }
}
