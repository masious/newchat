"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "newchat.muted";

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  });

  useEffect(() => {
    audioRef.current = new Audio("/sounds/message.mp3");
    audioRef.current.volume = 0.5;
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(muted));
  }, [muted]);

  const play = useCallback(() => {
    if (muted || !audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  }, [muted]);

  const toggleMute = useCallback(() => setMuted((p) => !p), []);

  useEffect(() => {
    const handler = () => play();
    window.addEventListener("newchat:new-message", handler);
    return () => window.removeEventListener("newchat:new-message", handler);
  }, [play]);

  return { muted, toggleMute };
}
