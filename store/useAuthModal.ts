import { create } from 'zustand';

interface AuthModalStore {
  isOpen: boolean;
  view: 'login' | 'register' | 'forgot_password';
  openModal: (view?: 'login' | 'register' | 'forgot_password') => void;
  closeModal: () => void;
  setView: (view: 'login' | 'register' | 'forgot_password') => void;
}

export const useAuthModal = create<AuthModalStore>((set) => ({
  isOpen: false,
  view: 'login',
  openModal: (view = 'login') => set({ isOpen: true, view }),
  closeModal: () => set({ isOpen: false }),
  setView: (view) => set({ view }),
}));
