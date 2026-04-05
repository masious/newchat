"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { safeLocalStorage } from "../safe-local-storage";

const STORAGE_KEY = "newchat.muted";

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    return safeLocalStorage.getItem(STORAGE_KEY) === "true";
  });

  useEffect(() => {
    audioRef.current = new Audio("/sounds/message.mp3");
    audioRef.current.volume = 0.5;
  }, []);

  useEffect(() => {
    safeLocalStorage.setItem(STORAGE_KEY, String(muted));
  }, [muted]);

  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    const handler = () => {
      if (mutedRef.current || !audioRef.current) return;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    };
    window.addEventListener("newchat:new-message", handler);
    return () => window.removeEventListener("newchat:new-message", handler);
  }, []);

  const toggleMute = useCallback(() => setMuted((p) => !p), []);

  return { muted, toggleMute };
}
