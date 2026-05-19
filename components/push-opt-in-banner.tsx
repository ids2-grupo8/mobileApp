/**
 * Banner that prompts the logged-in user to enable push notifications.
 *
 * Behaviour by environment:
 *   - Native (iOS/Android app): renders nothing (handled by FCM/APNS elsewhere).
 *   - Web, not installed: hidden (we don't pester users in a regular tab).
 *   - iOS Safari (not standalone): instructs the user to "Add to Home Screen".
 *   - Standalone PWA, permission default: shows enable button.
 *   - Permission granted: hidden.
 *   - Permission denied: hidden (user already decided).
 */

import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuthStore } from '@/store/auth';
import {
  enablePushNotifications,
  getActiveSubscription,
  getPushSupport,
  isIOSSafari,
  isStandalonePWA,
  type PushSupport,
} from '@/services/push';

const DISMISS_KEY = 'push_banner_dismissed_v1';

function isDismissed(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  return window.localStorage?.getItem(DISMISS_KEY) === '1';
}
function setDismissed() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  window.localStorage?.setItem(DISMISS_KEY, '1');
}

export function PushOptInBanner() {
  const { isLoggedIn } = useAuthStore();
  const [support, setSupport] = useState<PushSupport | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [hasSubscription, setHasSubscription] = useState<boolean>(false);
  const [dismissed, setDismissedState] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    setSupport(getPushSupport());
    setPermission(
      typeof Notification !== 'undefined' ? Notification.permission : null,
    );
    setDismissedState(isDismissed());
    getActiveSubscription().then((s) => setHasSubscription(!!s));
  }, [isLoggedIn]);

  if (Platform.OS !== 'web') return null;
  if (!isLoggedIn) return null;
  if (dismissed) return null;
  if (hasSubscription) return null;
  if (permission === 'granted') return null;
  if (permission === 'denied') return null;
  if (support === 'unsupported-browser' || support === 'unsupported-platform') return null;

  const needsInstall = support === 'needs-install';

  const handleEnable = async () => {
    setBusy(true);
    try {
      const sub = await enablePushNotifications();
      if (sub) setHasSubscription(true);
      else setPermission(typeof Notification !== 'undefined' ? Notification.permission : null);
    } finally {
      setBusy(false);
    }
  };

  const handleDismiss = () => {
    setDismissed();
    setDismissedState(true);
  };

  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={styles.content}>
        <Text style={styles.title}>
          {needsInstall ? 'Activá notificaciones' : 'Recibí avisos de tus órdenes'}
        </Text>
        <Text style={styles.body}>
          {needsInstall
            ? 'En iPhone: tocá el botón Compartir en Safari y elegí "Agregar a inicio". Después abrí Bazaar desde el ícono para activar las notificaciones.'
            : 'Te avisamos cuando cambie el estado de tu compra o cuando un producto tuyo se quede sin stock.'}
        </Text>
        {!needsInstall && (
          <View style={styles.row}>
            <Pressable
              onPress={handleEnable}
              disabled={busy}
              style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.primaryBtnText}>{busy ? 'Activando…' : 'Activar'}</Text>
            </Pressable>
            <Pressable onPress={handleDismiss} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>Ahora no</Text>
            </Pressable>
          </View>
        )}
        {needsInstall && (
          <Pressable onPress={handleDismiss} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Entendido</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    zIndex: 1000,
    backgroundColor: 'rgba(20,20,24,0.96)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  content: { gap: 8 },
  title: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  body: { color: '#8B8FA8', fontSize: 13, lineHeight: 18 },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  primaryBtn: {
    backgroundColor: '#C5F135',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  primaryBtnText: { color: '#0B0B0F', fontWeight: '600', fontSize: 13 },
  secondaryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  secondaryBtnText: { color: '#8B8FA8', fontSize: 13 },
});
