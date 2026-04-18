import { create } from "zustand";
import { useAuthStore } from "./auth";

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
  updateProfile: (data: Partial<Pick<UserProfile, 'name' | 'bio' | 'avatarUrl'>>) => Promise<void>;
};

export const useUserStore = create<UserStore>((set, get) => ({
  profile: null,
  loading: false,
  saving: false,

  fetchProfile: async () => {
    set({ loading: true });
    const authUser = useAuthStore.getState().user;
    if (!authUser) { set({ loading: false }); return; }

    set({
      profile: {
        id: authUser.id,
        name: authUser.name,
        email: authUser.email,
        bio: '',
        publications: [],
      },
      loading: false,
    });
  },

  updateProfile: async (data) => {
    set({ saving: true });
    const authUser = useAuthStore.getState().user;
    if (!authUser) { set({ saving: false }); return; }

    try {
      // TODO: PATCH /users/me
      const current = get().profile;
      if (current) set({ profile: { ...current, ...data }, saving: false });
      else set({ saving: false });
    } catch {
      set({ saving: false });
    }
  },
}));
