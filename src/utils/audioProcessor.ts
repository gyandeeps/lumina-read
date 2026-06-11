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
