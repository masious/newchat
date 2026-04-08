"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseTiltOptions {
  maxTilt?: number;
  perspective?: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function useTilt(options: UseTiltOptions = {}) {
  const { maxTilt = 8, perspective = 1000 } = options;
  const ref = useRef<HTMLImageElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const relX = (e.clientX - centerX) / (window.innerWidth / 2);
      const relY = (e.clientY - centerY) / (window.innerHeight / 2);

      setRotateY(clamp(relX * maxTilt, -maxTilt, maxTilt));
      setRotateX(clamp(-relY * maxTilt, -maxTilt, maxTilt));
    },
    [maxTilt],
  );

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const enter = () => setIsHovered(true);
    const leave = () => setIsHovered(false);

    el.addEventListener("mouseenter", enter);
    el.addEventListener("mouseleave", leave);
    return () => {
      el.removeEventListener("mouseenter", enter);
      el.removeEventListener("mouseleave", leave);
    };
  }, []);

  const style: React.CSSProperties = {
    transform: isHovered
      ? `perspective(${perspective}px) rotateX(0deg) rotateY(0deg)`
      : `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
    transition: "transform 0.3s ease",
  };

  return { ref, style, isHovered };
}
