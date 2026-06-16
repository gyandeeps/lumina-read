import confetti from 'canvas-confetti';
import { getFlowerShapes } from './flowerShapes';

let cachedFlowerShapes: any[] | null = null;

// ── Single managed confetti canvas ──────────────────────────────────
// canvas-confetti creates an internal <canvas> per `confetti()` call if none
// is provided. On iPad, each canvas consumes GPU-backed bitmap memory. We
// create one canvas and reuse it for all animations.
let confettiInstance: confetti.CreateTypes | null = null;

function getConfettiInstance(): confetti.CreateTypes {
  if (confettiInstance) return confettiInstance;

  const canvas = document.createElement('canvas');
  canvas.id = 'lumina-confetti-canvas';
  canvas.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
  document.body.appendChild(canvas);

  confettiInstance = confetti.create(canvas, { resize: true, useWorker: false });
  return confettiInstance;
}

/** Track active flower rain RAF so we can cancel it on re-trigger or cleanup. */
let flowerRainRafId: number | null = null;

// Warm-up/Pre-load shapes immediately when the module is imported
getFlowerShapes()
  .then((shapes) => {
    cachedFlowerShapes = shapes;
  })
  .catch((err) => {
    console.warn('Failed to pre-warm flower shapes:', err);
  });

/**
 * Reusable confetti functions to be used across different screens/components.
 */

/**
 * Cancel any running flower rain animation loop.
 */
export function cancelFlowerRain() {
  if (flowerRainRafId !== null) {
    cancelAnimationFrame(flowerRainRafId);
    flowerRainRafId = null;
  }
}

/**
 * Free GPU resources held by the confetti canvas. Call after animations settle.
 */
export function resetConfetti() {
  cancelFlowerRain();
  if (confettiInstance) {
    confettiInstance.reset();
  }
}

/**
 * Triggers a graceful falling rain of high-resolution vector flowers from the top of the screen.
 */
export function triggerFlowerRain() {
  // Cancel any previous rain before starting a new one
  cancelFlowerRain();

  const fire = getConfettiInstance();
  const duration = 2.5 * 1000;
  const end = Date.now() + duration;

  // Fallback to text emojis if custom canvas-drawn shapes aren't fully loaded
  const shapes = cachedFlowerShapes || [
    confetti.shapeFromText({ text: '🌸', scalar: 5 }),
    confetti.shapeFromText({ text: '🌼', scalar: 5 }),
    confetti.shapeFromText({ text: '🌺', scalar: 5 }),
    confetti.shapeFromText({ text: '🌻', scalar: 5 }),
    confetti.shapeFromText({ text: '🌹', scalar: 5 })
  ];

  let frameCount = 0;
  (function frame() {
    // Release a flower once every 8 frames to keep it sparse and elegant
    if (frameCount % 8 === 0) {
      fire({
        particleCount: 1,
        startVelocity: 0,
        ticks: 550, // Falls all the way down
        origin: {
          x: Math.random(),
          y: Math.random() * 0.1 - 0.1
        },
        shapes: [shapes[Math.floor(Math.random() * shapes.length)]],
        scalar: Math.random() * 1.8 + 2.2, // Large, visible shapes
        gravity: Math.random() * 0.2 + 0.35,
        drift: Math.random() * 1.0 - 0.5,
        spread: 0,
      });
    }
    frameCount++;

    if (Date.now() < end) {
      flowerRainRafId = requestAnimationFrame(frame);
    } else {
      flowerRainRafId = null;
    }
  }());
}

/**
 * Triggers two colorful bursts from the bottom left and bottom right corners of the screen.
 * Ideal for completing individual sentences.
 */
export function triggerSideBurst() {
  const fire = getConfettiInstance();

  // Left side burst
  fire({
    particleCount: 80,
    angle: 60,
    spread: 55,
    origin: { x: 0, y: 0.8 },
    colors: ['#ec4899', '#f43f5e', '#3b82f6', '#10b981', '#fbbf24'],
  });
  
  // Right side burst
  fire({
    particleCount: 80,
    angle: 120,
    spread: 55,
    origin: { x: 1, y: 0.8 },
    colors: ['#ec4899', '#f43f5e', '#3b82f6', '#10b981', '#fbbf24'],
  });

  // Free GPU resources after particles settle (~4s for ticks default of 200)
  setTimeout(() => {
    if (confettiInstance) confettiInstance.reset();
  }, 4500);
}

/**
 * Triggers a massive confetti explosion from the center of the screen.
 * Ideal for story completions and grand milestones.
 */
export function triggerSuccessExplosion() {
  const fire = getConfettiInstance();

  fire({
    particleCount: 200,
    spread: 100,
    origin: { y: 0.4 },
    colors: ['#ec4899', '#f43f5e', '#3b82f6', '#10b981', '#fbbf24', '#a855f7'],
  });

  // Free GPU resources after particles settle
  setTimeout(() => {
    if (confettiInstance) confettiInstance.reset();
  }, 5000);
}

