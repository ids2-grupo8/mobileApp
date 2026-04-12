import { create } from 'zustand';
import { useAuthStore } from './auth';

export type Publication = {
  id: string;
  title: string;
  price: number;
  imageUrl?: string;
  stock: number;
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  bio: string;
  avatarUrl?: string;
  publications: Publication[];
};

type UserStore = {
  profile: UserProfile | null;
  loading: boolean;
  saving: boolean;
  fetchProfile: () => Promise<void>;
  updateProfile: (
    data: Partial<Pick<UserProfile, 'name' | 'bio' | 'avatarUrl'>>
  ) => Promise<void>;
};

// Publicaciones mock hasta que el catalog-service tenga el endpoint
const MOCK_PUBLICATIONS: Publication[] = [
  { id: '1', title: 'Auriculares Bluetooth', price: 5000, stock: 3 },
  { id: '2', title: 'Cable USB-C 2m', price: 800, stock: 10 },
  { id: '3', title: 'Funda para iPhone 14', price: 1200, stock: 5 },
];

export const useUserStore = create<UserStore>((set, get) => ({
  profile: null,
  loading: false,
  saving: false,

  fetchProfile: async () => {
    set({ loading: true });

    // Toma los datos reales del usuario desde el auth store
    const authUser = useAuthStore.getState().user;

    // TODO: GET /api/v1/users/me cuando el endpoint exista
    // Por ahora construimos el perfil con los datos del login + publicaciones mock
    await new Promise<void>((r) => setTimeout(r, 400)); // simula latencia mínima

    set({
      profile: {
        id: authUser?.id ?? '',
        name: authUser?.name ?? '',
        email: authUser?.email ?? '',
        bio: '',
        publications: MOCK_PUBLICATIONS,
      },
      loading: false,
    });
  },

  updateProfile: async (data) => {
    set({ saving: true });
    // TODO: PATCH /api/v1/users/me
    await new Promise<void>((r) => setTimeout(r, 900));
    const current = get().profile;
    if (current) {
      set({ profile: { ...current, ...data }, saving: false });
    } else {
      set({ saving: false });
    }
  },
}));
