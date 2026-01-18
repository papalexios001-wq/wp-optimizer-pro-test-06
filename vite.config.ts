// ═══════════════════════════════════════════════════════════════════════════════
// WP OPTIMIZER PRO v39.0 — VITE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';


export default defineConfig({
    plugins: [
        react({
            jsxRuntime: 'automatic',
        }),
    ],
    resolve: {
        alias: {
      '@types': './types',        },
    },
    build: {
        target: 'esnext',
        outDir: 'dist',
        sourcemap: true,
        minify: 'esbuild',
        rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom'],
                    'ai-orchestrator': ['./lib/ai-orchestrator.ts'],
                },
            },
        },
        chunkSizeWarningLimit: 1000,
    },
    server: {
        port: 3000,
        host: true,
        open: true,
        cors: true,
    },
    preview: {
        port: 4173,
        host: true,
    },
    optimizeDeps: {
        include: ['react', 'react-dom', 'zustand'],
        exclude: [],
    },
    esbuild: {
        logOverride: { 'this-is-undefined-in-esm': 'silent' },
    },
});

