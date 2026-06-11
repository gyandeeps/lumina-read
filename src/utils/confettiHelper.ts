import confetti from 'canvas-confetti';
import { getFlowerShapes } from './flowerShapes';

let cachedFlowerShapes: any[] | null = null;

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
 * Triggers a graceful falling rain of high-resolution vector flowers from the top of the screen.
 */
export function triggerFlowerRain() {
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
      confetti({
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
      requestAnimationFrame(frame);
    }
  }());
}

/**
 * Triggers two colorful bursts from the bottom left and bottom right corners of the screen.
 * Ideal for completing individual sentences.
 */
export function triggerSideBurst() {
  // Left side burst
  confetti({
    particleCount: 80,
    angle: 60,
    spread: 55,
    origin: { x: 0, y: 0.8 },
    colors: ['#ec4899', '#f43f5e', '#3b82f6', '#10b981', '#fbbf24'],
  });
  
  // Right side burst
  confetti({
    particleCount: 80,
    angle: 120,
    spread: 55,
    origin: { x: 1, y: 0.8 },
    colors: ['#ec4899', '#f43f5e', '#3b82f6', '#10b981', '#fbbf24'],
  });
}

/**
 * Triggers a massive confetti explosion from the center of the screen.
 * Ideal for story completions and grand milestones.
 */
export function triggerSuccessExplosion() {
  confetti({
    particleCount: 200,
    spread: 100,
    origin: { y: 0.4 },
    colors: ['#ec4899', '#f43f5e', '#3b82f6', '#10b981', '#fbbf24', '#a855f7'],
  });
}
