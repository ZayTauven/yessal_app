/**
 * store/ui.store.ts — l'état d'interface qui traverse les écrans.
 *
 * Pour l'instant, une seule chose : le tiroir. Il est monté une fois dans
 * `app/(app)/_layout.tsx`, au-dessus des onglets, mais il s'ouvre depuis le
 * bouton d'en-tête de N'IMPORTE quel écran (§2 : « le tiroir ouvert par un
 * bouton en tête d'écran »).
 *
 * Passer un `onOpen` de couche en couche aurait obligé chaque écran à recevoir
 * une prop qu'il ne fait que transmettre. Un magasin est plus honnête : le
 * tiroir est un état global, il est déclaré comme tel.
 */
import { create } from "zustand";

interface UiState {
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  drawerOpen: false,
  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),
}));
