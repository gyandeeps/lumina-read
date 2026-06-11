import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'fs';
import path from 'path';

// Custom plugin to serve/copy ONNX Runtime Web (ORT) WASM and worker MJS files
function copyOrtAssetsPlugin() {
  return {
    name: 'copy-ort-assets',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url && req.url.startsWith('/wasm/')) {
          // Strip query parameters like ?import to resolve files correctly on disk
          const cleanUrl = req.url.split('?')[0];
          const fileName = cleanUrl.split('/').pop() || '';
          const assetPath = path.resolve('node_modules/onnxruntime-web/dist', fileName);
          
          if (fs.existsSync(assetPath)) {
            const ext = path.extname(fileName);
            if (ext === '.wasm') {
              res.setHeader('Content-Type', 'application/wasm');
            } else if (ext === '.js' || ext === '.mjs') {
              res.setHeader('Content-Type', 'application/javascript');
            }
            res.end(fs.readFileSync(assetPath));
            return;
          }
        }
        next();
      });
    },
    closeBundle() {
      const distWasmDir = path.resolve('dist/wasm');
      if (!fs.existsSync(distWasmDir)) {
        fs.mkdirSync(distWasmDir, { recursive: true });
      }
      const srcWasmDir = path.resolve('node_modules/onnxruntime-web/dist');
      if (fs.existsSync(srcWasmDir)) {
        const files = fs.readdirSync(srcWasmDir).filter(f => f.endsWith('.wasm') || f.endsWith('.mjs'));
        for (const file of files) {
          fs.copyFileSync(path.join(srcWasmDir, file), path.join(distWasmDir, file));
          console.log(`Copied ORT Asset to dist/wasm: ${file}`);
        }
      }
    }
  };
}

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/lumina-read/' : '/',
  plugins: [
    react(),
    copyOrtAssetsPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg', 'assets/*'],
      manifest: {
        name: 'LuminaRead',
        short_name: 'LuminaRead',
        description: 'An offline-capable AI reading companion for kids.',
        theme_color: '#fdf2f8',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'landscape',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,mp3,wasm,mjs,json}'],
        maximumFileSizeToCacheInBytes: 30 * 1024 * 1024, // 30MB to support ORT WASM files
      }
    })
  ],
  worker: {
    format: 'es'
  }
});
