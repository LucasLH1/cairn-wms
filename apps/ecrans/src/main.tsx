import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BarcodeService, BarcodeServiceContext } from './barcode/service.js';
import { startLabels } from './i18n.js';
import { createAppRouter } from './router.js';
import { SignalChannel } from './signals/signals.js';
import { SignalChannelContext } from './signals/useChangeSignal.js';
import './styles.css';

const container = document.getElementById('root');
if (container === null) {
  throw new Error('root element missing');
}

// Pas de magasin d'état global : les données du serveur vivent dans ce cache (fiche 0025, règle 1).
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});
const router = createAppRouter(queryClient);
// À la reconnexion du canal, tout ce qui est affiché est relu (fiche 0026, règle 3).
const signals = new SignalChannel(() => {
  void queryClient.invalidateQueries();
});
// Sans écran qui l'attende, une lecture ouvrira l'objet lu ; aucun objet ne s'ouvre encore ainsi.
const barcode = new BarcodeService(() => undefined);
barcode.start();

await startLabels();

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SignalChannelContext value={signals}>
        <BarcodeServiceContext value={barcode}>
          <RouterProvider router={router} />
        </BarcodeServiceContext>
      </SignalChannelContext>
    </QueryClientProvider>
  </StrictMode>,
);
