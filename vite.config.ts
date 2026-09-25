import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const mistralKey =
    process.env.MISTRAL_API_KEY ||
    process.env.VITE_MISTRAL_API_KEY ||
    env.MISTRAL_API_KEY ||
    env.VITE_MISTRAL_API_KEY ||
    '';
  const geminiKey =
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    env.GEMINI_API_KEY ||
    env.VITE_GEMINI_API_KEY ||
    '';

  return {
    envPrefix: ['VITE_', 'MISTRAL_', 'GEMINI_'],
    define: {
      'import.meta.env.VITE_MISTRAL_API_KEY': JSON.stringify(mistralKey),
      'import.meta.env.MISTRAL_API_KEY': JSON.stringify(mistralKey),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(geminiKey),
      'import.meta.env.GEMINI_API_KEY': JSON.stringify(geminiKey),
    },
    plugins: [react()],
    server: {
      port: 8080,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'esnext',
      cssCodeSplit: true,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('scheduler')) {
                return 'vendor-react';
              }
              if (id.includes('framer-motion')) {
                return 'vendor-framer';
              }
            }
          },
        },
      },
    },
  };
});
