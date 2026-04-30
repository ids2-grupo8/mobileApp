import { USERS } from "@/constants/api";
import { ApiError, getRefreshToken, request, saveTokens } from "./http";

// ─── Federated (Google) OAuth ─────────────────────────────────────────────────

// Supabase OAuth entry point. The redirect_to must be whitelisted in
// Supabase → Authentication → URL Configuration → Redirect URLs.
const SUPABASE_URL = "https://qlrrvjnczdcnbffrgpdv.supabase.co";
export const GOOGLE_OAUTH_URL =
  `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=mobileapp://`;

// ─── Types ───────────────────────────────────────────────────────────────────

type UserData = {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
};

type LoginResponse = {
  data: UserData;
  token: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
};

type RegisterResponse = {
  data: UserData;
};

type PinStatusResponse = {
  pin_enabled: boolean;
};

export type ResetPasswordPayload = {
  access_token: string;
  refresh_token: string;
  new_password: string;
  confirm_password: string;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

// ─── Requests ────────────────────────────────────────────────────────────────

export async function loginRequest(
  email: string,
  password: string,
): Promise<AuthUser> {
  const res = await request<LoginResponse>(USERS("/auth/login"), {
    method: "POST",
    body: { email, password },
    auth: false,
  });
  await saveTokens(res.token.access_token, res.token.refresh_token);
  return {
    id: res.data.id,
    email: res.data.email,
    name: res.data.full_name,
  };
}

export async function registerRequest(
  name: string,
  email: string,
  password: string,
): Promise<AuthUser> {
  // El register solo crea el usuario; el token se obtiene haciendo login a continuación
  await request<RegisterResponse>(USERS("/auth/register"), {
    method: "POST",
    body: { full_name: name, email, password },
    auth: false,
  });
  return loginRequest(email, password);
}

export async function federatedLoginRequest(
  accessToken: string,
  refreshToken: string,
): Promise<AuthUser> {
  const res = await request<LoginResponse>(USERS("/auth/federated-login"), {
    method: "POST",
    body: { access_token: accessToken, refresh_token: refreshToken },
    auth: false,
  });
  await saveTokens(res.token.access_token, res.token.refresh_token);
  return {
    id: res.data.id,
    email: res.data.email,
    name: res.data.full_name,
  };
}

export async function forgotPasswordRequest(email: string): Promise<void> {
  await request(USERS("/auth/forgot-password"), {
    method: "POST",
    body: { email },
    auth: false,
  });
}

export async function resetPasswordRequest(
  payload: ResetPasswordPayload,
): Promise<void> {
  await request(USERS("/auth/reset-password"), {
    method: "POST",
    body: payload,
    auth: false,
  });
}

export async function enrollPinRequest(
  pin: string,
  deviceId: string,
): Promise<void> {
  await request(USERS("/auth/pin/enroll"), {
    method: "POST",
    body: { pin, device_id: deviceId },
    auth: true,
  });
}

export async function pinStatusRequest(deviceId: string): Promise<boolean> {
  const res = await request<PinStatusResponse>(
    `${USERS("/auth/pin/status")}?device_id=${encodeURIComponent(deviceId)}`,
    {
      method: "GET",
      auth: true,
    },
  );
  return Boolean(res.pin_enabled);
}

export async function pinLoginRequest(
  pin: string,
  deviceId: string,
): Promise<AuthUser> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    throw new ApiError(
      401,
      "Sesión expirada. Iniciá sesión con email y contraseña.",
    );
  }
  const res = await request<LoginResponse>(USERS("/auth/pin/login"), {
    method: "POST",
    body: { pin, device_id: deviceId, refresh_token: refreshToken },
    auth: false,
  });
  await saveTokens(res.token.access_token, res.token.refresh_token);
  return {
    id: res.data.id,
    email: res.data.email,
    name: res.data.full_name,
  };
}

// ─── Error handling ──────────────────────────────────────────────────────────

export function toUserMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { title?: string; detail?: string } | undefined;
    const detail = body?.detail?.toLowerCase() ?? "";

    if (err.status === 401)
      return "Credenciales inválidas. Verificá tu email/contraseña o PIN.";
    if (err.status === 409) return "Ya existe una cuenta con ese email.";
    if (err.status === 403)
      return "Tu cuenta está suspendida. Contactá soporte.";
    if (err.status === 429)
      return "Demasiados intentos. Esperá unos minutos e intentá de nuevo.";
    if (err.status === 423)
      return "El acceso por PIN está bloqueado temporalmente. Iniciá sesión con email y contraseña.";
    if (err.status === 400) {
      // Recovery link error
      if (body?.title === "Invalid recovery link") {
        return "El enlace de recupero es inválido o ya expiró. Solicitá uno nuevo desde el login.";
      }
      return (
        body?.detail ?? err.message ?? "Datos inválidos. Revisá los campos."
      );
    }
    if (
      err.status === 503 &&
      (detail.includes("external identity provider unavailable") ||
        detail.includes("email and password"))
    ) {
      return "No se pudo iniciar sesión con Google. Intentá nuevamente o usá email y contraseña.";
    }
    if (err.status >= 500)
      return "Error del servidor. Intentá de nuevo en unos minutos.";
    return err.message;
  }
  if (err instanceof TypeError) {
    console.error("[API] Network error:", err.message);
    return "Sin conexión. Verificá tu red e intentá de nuevo.";
  }
  console.error("[API] Unexpected error:", err);
  return "Ocurrió un error inesperado.";
}
