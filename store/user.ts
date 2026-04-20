import { create } from "zustand";
import { fetchMyProducts } from "@/services/catalog";
import { getUserProfile, uploadProfilePhoto, updateUserProfile } from "@/services/user";
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

    try {
      const [profileRes, products] = await Promise.all([
        getUserProfile(authUser.email),
        fetchMyProducts().catch(() => []),
      ]);
      set({
        profile: {
          id: profileRes.data.id,
          name: profileRes.data.full_name,
          email: profileRes.data.email,
          bio: profileRes.data.description ?? '',
          avatarUrl: profileRes.data.photo ?? undefined,
          publications: products.map((p) => ({
            id: p.id,
            title: p.title,
            price: p.price,
            imageUrl: p.imageUrl,
            stock: p.stock,
          })),
        },
        loading: false,
      });
    } catch {
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
    }
  },

  updateProfile: async (data) => {
    set({ saving: true });
    const authUser = useAuthStore.getState().user;
    if (!authUser) { set({ saving: false }); return; }

    try {
      const isLocalUri = (uri?: string) =>
        !!uri && !uri.startsWith('http');

      let resolvedPhotoUrl: string | undefined = data.avatarUrl;

      if (isLocalUri(data.avatarUrl)) {
        const res = await uploadProfilePhoto(data.avatarUrl!);
        resolvedPhotoUrl = res.data.photo ?? undefined;
      }

      const profileRes = await updateUserProfile({
        full_name: data.name,
        description: data.bio,
      });

      const current = get().profile;
      if (current) {
        set({
          profile: {
            ...current,
            name: profileRes.data.full_name,
            bio: profileRes.data.description ?? '',
            avatarUrl: resolvedPhotoUrl ?? current.avatarUrl,
          },
          saving: false,
        });
      } else {
        set({ saving: false });
      }
    } catch {
      set({ saving: false });
    }
  },
}));
