/**
 * AudioWorklet processor that downsamples mic input from the browser's native
 * sample rate to 16kHz mono and posts the result to the main thread.
 *
 * Runs entirely in the audio rendering thread, keeping the main thread free
 * for React rendering and UI updates.
 *
 * Registered as 'downsampler-processor'.
 */
class DownsamplerProcessor extends AudioWorkletProcessor {
  private targetSampleRate: number;
  private resampleRatio: number;
  private fractionalIndex: number;

  constructor() {
    super();
    this.targetSampleRate = 16000;
    // sampleRate is a global available in AudioWorkletGlobalScope
    this.resampleRatio = sampleRate / this.targetSampleRate;
    this.fractionalIndex = 0;
  }

  process(inputs: Float32Array[][], _outputs: Float32Array[][], _parameters: Record<string, Float32Array>): boolean {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const channelData = input[0];
    if (!channelData || channelData.length === 0) return true;

    if (sampleRate === this.targetSampleRate) {
      // No resampling needed — send as-is
      this.port.postMessage({ audio: new Float32Array(channelData) });
      return true;
    }

    // Downsample using linear interpolation for better quality than nearest-neighbor
    const outputLength = Math.floor((channelData.length - this.fractionalIndex) / this.resampleRatio);
    if (outputLength <= 0) return true;

    const output = new Float32Array(outputLength);
    let outIdx = 0;

    for (let i = 0; i < outputLength; i++) {
      const srcIndex = this.fractionalIndex + i * this.resampleRatio;
      const intIndex = Math.floor(srcIndex);
      const frac = srcIndex - intIndex;

      if (intIndex + 1 < channelData.length) {
        // Linear interpolation between adjacent samples
        output[outIdx++] = channelData[intIndex] * (1 - frac) + channelData[intIndex + 1] * frac;
      } else if (intIndex < channelData.length) {
        output[outIdx++] = channelData[intIndex];
      }
    }

    // Track fractional remainder for seamless resampling across process() calls
    this.fractionalIndex = (this.fractionalIndex + outputLength * this.resampleRatio) - channelData.length;
    if (this.fractionalIndex < 0) this.fractionalIndex = 0;

    if (outIdx > 0) {
      const trimmed = outIdx === output.length ? output : output.subarray(0, outIdx);
      this.port.postMessage({ audio: new Float32Array(trimmed) });
    }

    return true;
  }
}

registerProcessor('downsampler-processor', DownsamplerProcessor);
