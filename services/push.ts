/**
 * Web Push subscription client.
 *
 * Only does real work on the web build (PWA). On native, all functions
 * become no-ops so call sites don't need to branch.
 *
 * iOS Safari requires the user to "Add to Home Screen" first; permission
 * prompts only succeed from the installed PWA context.
 */

import { Platform } from 'react-native';

import { NOTIFICATIONS } from '@/constants/api';
import { useAuthStore } from '@/store/auth';
import { request } from './http';

export type PushSupport =
  | 'unsupported-platform'
  | 'unsupported-browser'
  | 'needs-install'
  | 'ready';

/** True on web when PWA was added to home screen (iOS) or installed (Android/desktop). */
export function isStandalonePWA(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  // iOS Safari
  const iosStandalone =
    typeof (window.navigator as any).standalone === 'boolean' &&
    (window.navigator as any).standalone === true;
  // Other browsers (Android Chrome, desktop PWA)
  const displayStandalone =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  return iosStandalone || displayStandalone;
}

export function isIOSSafari(): boolean {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIOS && isSafari;
}

export function getPushSupport(): PushSupport {
  if (Platform.OS !== 'web') return 'unsupported-platform';
  if (typeof window === 'undefined') return 'unsupported-platform';
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'unsupported-browser';
  }
  // iOS only enables Push when running as installed PWA.
  if (isIOSSafari() && !isStandalonePWA()) return 'needs-install';
  return 'ready';
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (Platform.OS !== 'web' || !('serviceWorker' in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration('/');
  if (existing) return existing;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch (err) {
    console.warn('[push] SW register failed', err);
    return null;
  }
}

let cachedVapidKey: string | null = null;

export async function prefetchVapidPublicKey(): Promise<void> {
  await fetchVapidPublicKey();
}

async function fetchVapidPublicKey(): Promise<string | null> {
  if (cachedVapidKey) return cachedVapidKey;
  try {
    const res = await request<{ public_key: string }>(
      NOTIFICATIONS('/web-push/vapid-public-key'),
      { method: 'GET', auth: false, silent: true },
    );
    cachedVapidKey = res.public_key ?? null;
    return cachedVapidKey;
  } catch (err) {
    console.warn('[push] could not fetch VAPID public key', err);
    return null;
  }
}

/**
 * Requests permission and subscribes to push. Returns the subscription
 * on success or null if the user denied / unsupported.
 */
export async function enablePushNotifications(): Promise<PushSubscription | null> {
  const support = getPushSupport();
  if (support !== 'ready') {
    console.warn('[push] cannot enable, support=', support);
    return null;
  }

  const userEmail = useAuthStore.getState().user?.email;
  if (!userEmail) {
    console.warn('[push] no logged-in user; cannot subscribe');
    return null;
  }

  // iOS Safari descarta el gesto del usuario si requestPermission() se llama
  // tras un await. Lo invocamos sincrónicamente al inicio (la VAPID key se
  // pre-fetchea en el banner, así no hay await previo en el caso común).
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const vapidKey = await fetchVapidPublicKey();
  if (!vapidKey) {
    console.warn('[push] VAPID public key unavailable');
    return null;
  }

  const reg = await getRegistration();
  if (!reg) return null;

  let subscription = await reg.pushManager.getSubscription();
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
    });
  }

  await sendSubscriptionToBackend(subscription, userEmail);
  return subscription;
}

export async function disablePushNotifications(): Promise<void> {
  if (Platform.OS !== 'web' || !('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration('/');
  if (!reg) return;
  const subscription = await reg.pushManager.getSubscription();
  if (!subscription) return;
  try {
    await request(NOTIFICATIONS('/web-push/subscriptions'), {
      method: 'DELETE',
      body: { endpoint: subscription.endpoint },
      silent: true,
    });
  } catch {
    // best-effort
  }
  await subscription.unsubscribe();
}

export async function getActiveSubscription(): Promise<PushSubscription | null> {
  if (Platform.OS !== 'web' || !('serviceWorker' in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration('/');
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

async function sendSubscriptionToBackend(
  sub: PushSubscription,
  userEmail: string,
): Promise<void> {
  const payload = sub.toJSON();
  // We use the user's email as the user_id, since the existing stock_consumer
  // publishes `seller_id` = seller email and the buyer flow will do the same.
  await request(NOTIFICATIONS('/web-push/subscriptions'), {
    method: 'POST',
    body: {
      user_id: userEmail,
      endpoint: payload.endpoint,
      keys: payload.keys,
      user_agent:
        typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    },
  });
}

/**
 * Wires the SW → app navigation. When a notification is clicked the SW posts
 * { type: 'navigate', url } back. The router callback decides where to go.
 */
export function setupNotificationClickListener(onNavigate: (url: string) => void): () => void {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {};
  }
  const handler = (event: MessageEvent) => {
    if (event.data && event.data.type === 'navigate' && typeof event.data.url === 'string') {
      onNavigate(event.data.url);
    }
  };
  navigator.serviceWorker.addEventListener('message', handler);
  return () => navigator.serviceWorker.removeEventListener('message', handler);
}
