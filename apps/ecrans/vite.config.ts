import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Le serveur que les écrans appellent : celui de `pnpm dev`, ou l'instance des tests de bout en bout.
const api = process.env['CAIRN_API_ORIGIN'] ?? 'http://localhost:3000';
// Les routes du contrat vivent sous /api, côté serveur comme côté écrans ; le canal temps réel aussi.
const proxy = {
  '/api': {
    target: api,
    ws: true,
    // Un écran qui se ferme coupe son canal temps réel : ce n'est pas une erreur à signaler.
    configure: (server: {
      on: (event: 'error', listener: (error: NodeJS.ErrnoException) => void) => void;
    }) => {
      server.on('error', (error) => {
        if (error.code !== 'ECONNRESET') console.error(error);
      });
    },
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Les paquets de l'espace de travail sont lus depuis leurs sources (fiche 0023).
    conditions: ['@cairn/source'],
  },
  server: { proxy },
  preview: { proxy },
});
