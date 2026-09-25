import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Les paquets de l'espace de travail sont lus depuis leurs sources (fiche 0023).
    conditions: ['@cairn/source'],
  },
  server: {
    proxy: {
      // Les routes du contrat vivent sous /api, côté serveur comme côté écrans.
      '/api': { target: 'http://localhost:3000' },
    },
  },
});
