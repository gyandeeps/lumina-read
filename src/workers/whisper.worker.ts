import { pipeline, env } from '@huggingface/transformers';

// Configure ONNX Runtime to load WASM binaries locally from the PWA cache
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.wasmPaths = '/wasm/';
}
env.allowLocalModels = false;

let transcriber: any = null;

const log = (...args: any[]) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

async function getTranscriber(progressCallback: (data: any) => void) {
  if (transcriber) return transcriber;

  log('Worker: Initializing Whisper Tiny pipeline...');
  
  // Try WebGPU first
  try {
    log('Worker: Attempting WebGPU initialization...');
    transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
      device: 'webgpu',
      progress_callback: progressCallback,
    });
    log('Worker: Pipeline initialized successfully with WebGPU.');
    return transcriber;
  } catch (webgpuError) {
    console.warn('Worker: WebGPU failed, falling back to WASM/CPU:', webgpuError);
    
    // Fallback to WASM
    try {
      transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
        device: 'wasm',
        progress_callback: progressCallback,
      });
      log('Worker: Pipeline initialized successfully with WASM.');
      return transcriber;
    } catch (wasmError) {
      console.error('Worker: WASM initialization failed:', wasmError);
      throw wasmError;
    }
  }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event: MessageEvent) => {
  const { type, wasmPaths } = event.data;

  if (type === 'init') {
    if (wasmPaths && env.backends.onnx.wasm) {
      env.backends.onnx.wasm.wasmPaths = wasmPaths;
    }
    try {
      await getTranscriber((data) => {
        // Send loading progress back to UI
        if (data.status === 'progress') {
          self.postMessage({
            status: 'progress',
            file: data.file,
            progress: data.progress,
            loaded: data.loaded,
            total: data.total,
          });
        } else if (data.status === 'ready') {
          self.postMessage({
            status: 'file_ready',
            file: data.file
          });
        }
      });
      self.postMessage({ status: 'ready' });
    } catch (err: any) {
      self.postMessage({ status: 'error', message: `Initialization failed: ${err.message || err}` });
    }
  }

  if (type === 'process') {
    const { audio, sessionId } = event.data;
    if (!audio) {
      self.postMessage({ status: 'error', message: 'No audio data received.', sessionId });
      return;
    }

    try {
      const pipe = await getTranscriber(() => {});
      
      const response = await pipe(audio, {
        chunk_length_s: 10,
        stride_length_s: 2,
        return_timestamps: 'word',
      });
      log(`Worker: Recognized text: "${response?.text || ''}"`);

      self.postMessage({
        status: 'result',
        data: response,
        sessionId,
      });
    } catch (err: any) {
      console.error('Worker: Error transcribing audio:', err);
      self.postMessage({ status: 'error', message: `Transcription failed: ${err.message || err}`, sessionId });
    }
  }
});
