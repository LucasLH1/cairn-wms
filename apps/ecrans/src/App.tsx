import { fr } from '@cairn/libelles';
import { StatusBadge } from '@cairn/ui';

export function App() {
  return (
    <main className="min-h-screen bg-bg p-8 text-text">
      <h1 className="text-title font-semibold">{fr.application.name}</h1>
      <StatusBadge tone="ok">{fr.application.name}</StatusBadge>
    </main>
  );
}
