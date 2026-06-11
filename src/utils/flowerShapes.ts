import confetti from 'canvas-confetti';

let cachedFlowerShapes: any[] | null = null;

/**
 * Dynamically draws high-resolution, realistic vector flowers using Canvas 2D API
 * and returns them as ImageBitmap shapes for canvas-confetti.
 * This runs 100% offline, requires no network requests, and provides
 * extremely smooth, crisp, anti-aliased animations.
 */
export async function getFlowerShapes(): Promise<any[]> {
  if (cachedFlowerShapes) {
    return cachedFlowerShapes;
  }

  const size = 128; // High resolution base size for crisp rendering

  const drawFlower = (drawFn: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Clear and translate context to center of canvas
      ctx.clearRect(0, 0, size, size);
      ctx.translate(size / 2, size / 2);
      // Turn on high-quality scaling and anti-aliasing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      drawFn(ctx);
    }
    return canvas;
  };

  try {
    // 1. Cherry Blossom (🌸 Sakura Style)
    // Soft pink petals with notched ends, yellow center with tiny pink-tipped stamens
    const sakuraCanvas = drawFlower((ctx) => {
      const petals = 5;
      
      // Draw petals
      for (let i = 0; i < petals; i++) {
        // Soft pink gradient for depth
        const petalGrad = ctx.createLinearGradient(0, 0, 0, -50);
        petalGrad.addColorStop(0, '#ffe4e6'); // light pink center
        petalGrad.addColorStop(1, '#f472b6'); // deeper pink tip
        
        ctx.fillStyle = petalGrad;
        ctx.strokeStyle = '#db2777';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        // Draw a heart-shaped notched petal
        ctx.bezierCurveTo(-18, -20, -22, -48, 0, -44);
        ctx.bezierCurveTo(22, -48, 18, -20, 0, 0);
        ctx.fill();
        ctx.stroke();
        ctx.rotate((Math.PI * 2) / petals);
      }

      // Draw little stamen lines radiating from the center
      ctx.strokeStyle = '#be185d';
      ctx.lineWidth = 1.2;
      const stamens = 10;
      for (let i = 0; i < stamens; i++) {
        const angle = (Math.PI * 2 / stamens) * i;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * 16, Math.sin(angle) * 16);
        ctx.stroke();
        
        // Pollen tip
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * 16, Math.sin(angle) * 16, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#f59e0b'; // golden pollen
        ctx.fill();
      }

      // Soft yellow core
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#fef08a';
      ctx.fill();
    });

    // 2. White Daisy (🌼 Daisy Style)
    // Detailed radiating white petals and a textured golden-orange center disc
    const daisyCanvas = drawFlower((ctx) => {
      const petals = 14;
      
      // Cream-white petals
      for (let i = 0; i < petals; i++) {
        ctx.fillStyle = '#fafaf9';
        ctx.strokeStyle = '#d6d3d1';
        ctx.lineWidth = 1.2;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-7, -15, -7, -46, 0, -50);
        ctx.bezierCurveTo(7, -46, 7, -15, 0, 0);
        ctx.fill();
        ctx.stroke();
        ctx.rotate((Math.PI * 2) / petals);
      }

      // Golden center disc with radial gradient
      const discGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 16);
      discGrad.addColorStop(0, '#f59e0b'); // amber-500
      discGrad.addColorStop(0.7, '#d97706'); // amber-600
      discGrad.addColorStop(1, '#b45309'); // amber-700
      
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fillStyle = discGrad;
      ctx.fill();

      // Seed texture on the disc
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // 3. Sunflower (🌻 Sunflower Style)
    // Double layered bright yellow petals with a dark brown/black textured seed center
    const sunflowerCanvas = drawFlower((ctx) => {
      const petals = 18;
      
      // Outer petal layer
      ctx.fillStyle = '#fbbf24'; // amber-400
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 0.8;
      for (let i = 0; i < petals; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-8, -15, -10, -46, 0, -52);
        ctx.bezierCurveTo(10, -46, 8, -15, 0, 0);
        ctx.fill();
        ctx.stroke();
        ctx.rotate((Math.PI * 2) / petals);
      }

      // Inner petal layer (offset slightly for fullness)
      ctx.fillStyle = '#f59e0b'; // amber-500
      ctx.rotate(Math.PI / petals);
      for (let i = 0; i < petals; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-6, -12, -8, -38, 0, -42);
        ctx.bezierCurveTo(8, -38, 6, -12, 0, 0);
        ctx.fill();
        ctx.stroke();
        ctx.rotate((Math.PI * 2) / petals);
      }

      // Large dark brown seed center
      const centerGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 19);
      centerGrad.addColorStop(0, '#451a03'); // warm brown
      centerGrad.addColorStop(0.8, '#270800'); // dark brown
      centerGrad.addColorStop(1, '#0c0400'); // blackish brown
      
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.fillStyle = centerGrad;
      ctx.fill();

      // Seed texture rings
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // 4. Rose (🌹 Rose Style)
    // Red layered spiral petals that look rich and multi-dimensional
    const roseCanvas = drawFlower((ctx) => {
      ctx.lineWidth = 1.5;

      const drawRosePetal = (sizeX: number, sizeY: number, distanceY: number, rot: number) => {
        ctx.save();
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.ellipse(0, -distanceY, sizeX, sizeY, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      };

      // Layer 3 (Outer Petals)
      ctx.fillStyle = '#ef4444'; // red-500
      ctx.strokeStyle = '#991b1b'; // red-800
      for (let i = 0; i < 5; i++) {
        drawRosePetal(26, 18, 20, (Math.PI * 2 / 5) * i);
      }

      // Layer 2 (Middle Petals)
      ctx.fillStyle = '#dc2626'; // red-600
      for (let i = 0; i < 5; i++) {
        drawRosePetal(19, 14, 13, (Math.PI * 2 / 5) * i + 0.6);
      }

      // Layer 1 (Inner Petals)
      ctx.fillStyle = '#b91c1c'; // red-700
      for (let i = 0; i < 5; i++) {
        drawRosePetal(13, 9, 8, (Math.PI * 2 / 5) * i + 0.3);
      }

      // Center tight bud
      ctx.fillStyle = '#991b1b'; // red-800
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Little spiral stroke to show depth inside bud
      ctx.strokeStyle = '#f87171'; // red-400 highlight
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0.5, Math.PI * 1.5);
      ctx.stroke();
    });

    // 5. Hibiscus (🌺 Hibiscus Style)
    // 5 vibrant magenta-red petals with a bleeding crimson core and a prominent yellow pistil
    const hibiscusCanvas = drawFlower((ctx) => {
      const petals = 5;
      
      // Draw petals
      for (let i = 0; i < petals; i++) {
        // Red-to-pink gradient
        const petalGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 48);
        petalGrad.addColorStop(0, '#be123c'); // crimson center
        petalGrad.addColorStop(0.25, '#f43f5e'); // rose pink
        petalGrad.addColorStop(1, '#db2777'); // deep magenta outer edge
        
        ctx.fillStyle = petalGrad;
        ctx.strokeStyle = '#881337';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-22, -15, -28, -50, 0, -48);
        ctx.bezierCurveTo(28, -50, 22, -15, 0, 0);
        ctx.fill();
        ctx.stroke();
        ctx.rotate((Math.PI * 2) / petals);
      }

      // Golden pistil column extending outward
      ctx.save();
      ctx.rotate(-Math.PI / 8); // Angled for dynamic look
      
      // Draw column
      ctx.strokeStyle = '#fbbf24'; // amber-400
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -32);
      ctx.stroke();

      // Golden pollen tips
      ctx.fillStyle = '#f59e0b'; // amber-500
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 4) * (i - 2.5) - Math.PI / 2;
        const radius = 5;
        const px = Math.cos(angle) * radius;
        const py = -32 + Math.sin(angle) * radius;
        ctx.beginPath();
        ctx.arc(px, py, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    const canvases = [sakuraCanvas, daisyCanvas, sunflowerCanvas, roseCanvas, hibiscusCanvas];

    // Create ImageBitmaps asynchronously
    const bitmaps = await Promise.all(
      canvases.map((canvas) => createImageBitmap(canvas))
    );

    // Scale so that the standard 10px particle corresponds to our 128px bitmap
    const scale = 1 / (size / 10); // 10 / 128 = 0.078125

    cachedFlowerShapes = bitmaps.map((bitmap) => ({
      type: 'bitmap',
      bitmap,
      matrix: [scale, 0, 0, scale, (-size * scale) / 2, (-size * scale) / 2]
    }));

    return cachedFlowerShapes!;
  } catch (error) {
    console.warn('Failed to load custom canvas-drawn flower shapes, falling back to emoji shapeFromText:', error);
    
    // Smooth text-emoji fallback if createImageBitmap/OffscreenCanvas is unsupported (e.g. older legacy browsers)
    cachedFlowerShapes = [
      confetti.shapeFromText({ text: '🌸', scalar: 5 }),
      confetti.shapeFromText({ text: '🌼', scalar: 5 }),
      confetti.shapeFromText({ text: '🌺', scalar: 5 }),
      confetti.shapeFromText({ text: '🌻', scalar: 5 }),
      confetti.shapeFromText({ text: '🌹', scalar: 5 })
    ];
    return cachedFlowerShapes!;
  }
}
