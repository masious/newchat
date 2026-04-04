"use client";

import { useEffect, useState } from "react";
import { trpc } from "../trpc";

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const registerPushMutation = trpc.push.subscribe.useMutation();
  const unregisterPushMutation = trpc.push.unsubscribe.useMutation();

  useEffect(() => {
    // Check if browser supports notifications and service workers
    const supported =
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;

    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      }
    } catch (error) {
      console.error("Error checking push subscription:", error);}
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      console.error("Push notifications are not supported in this browser");
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === "granted") {
        await subscribeToPush();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  };

  const subscribeToPush = async () => {
    try {
      // Register service worker if not already registered
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register("/sw.js");
        await registration.update();
      }

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      // Use existing browser subscription or create a new one
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          throw new Error("VAPID public key not configured");
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidPublicKey,
        });
      }

      // Always send subscription to server (handles re-login, DB resets, key rotation)
      await registerPushMutation.mutateAsync({
        subscription: subscription.toJSON() as { keys: { p256dh: string; auth: string }; endpoint: string },
      });

      setIsSubscribed(true);
    } catch (error) {
      console.error("Error subscribing to push notifications:", error);
      throw error;
    }
  };

  const unsubscribe = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        return;
      }

      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await unregisterPushMutation.mutateAsync();
        setIsSubscribed(false);
      }
    } catch (error) {
      console.error("Error unsubscribing from push notifications:", error);
      throw error;
    }
  };

  return {
    permission,
    isSupported,
    isSubscribed,
    requestPermission,
    unsubscribe,
  };
}
