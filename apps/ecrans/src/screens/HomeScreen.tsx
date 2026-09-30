import { Navigate } from '@tanstack/react-router';

/**
 * Accueil. La file de décisions (RG-SUR-035) naît avec le premier flux qui produit une décision
 * (module 1.1) ; d'ici là, l'accueil conduit au premier écran que l'utilisateur peut ouvrir, dans
 * l'ordre de la navigation (README du lot 1, décisions du 2026-09-30, point 5). Réceptions est
 * ouvert à tous : c'est donc lui.
 */
export function HomeScreen() {
  return <Navigate to="/receptions" replace />;
}
