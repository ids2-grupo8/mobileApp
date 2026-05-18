import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { NOTIFICATIONS } from "@/constants/api";
import { request } from "./http";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerPushToken(sellerId: string): Promise<void> {
  if (Platform.OS === "web") return;

  const existing = await Notifications.getPermissionsAsync() as { granted: boolean };
  let granted = existing.granted;

  if (!granted) {
    const result = await Notifications.requestPermissionsAsync() as { granted: boolean };
    granted = result.granted;
  }

  if (!granted) return;

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const expoToken = tokenData.data;

  await request(NOTIFICATIONS("/api/v1/devices"), {
    method: "POST",
    body: { seller_id: sellerId, expo_token: expoToken },
    auth: true,
  });
}

export type StockNotificationData = {
  product_id: string;
  product_name: string;
  type: "low_stock" | "out_of_stock";
};

export function addNotificationListener(
  onReceive: (data: StockNotificationData) => void,
) {
  return Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data as StockNotificationData;
    if (data?.type) onReceive(data);
  });
}
