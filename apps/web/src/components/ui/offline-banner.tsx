"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";

export function OfflineBanner() {
  const [disconnected, setDisconnected] = useState(false);

  useEffect(() => {
    const handleDisconnect = () => setDisconnected(true);
    const handleReconnect = () => setDisconnected(false);

    window.addEventListener("newchat:sse-disconnected", handleDisconnect);
    window.addEventListener("newchat:sse-reconnected", handleReconnect);

    return () => {
      window.removeEventListener("newchat:sse-disconnected", handleDisconnect);
      window.removeEventListener("newchat:sse-reconnected", handleReconnect);
    };
  }, []);

  if (!disconnected) return null;

  const handleRetry = () => {
    setDisconnected(false);
    window.dispatchEvent(new CustomEvent("newchat:sse-reconnect"));
  };

  return (
    <div className="flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-sm text-white">
      <WifiOff className="h-4 w-4" />
      <span>Connection lost. Messages may be delayed.</span>
      <button
        onClick={handleRetry}
        className="ml-2 flex items-center gap-1 rounded-lg bg-white/20 px-3 py-1 text-sm font-semibold hover:bg-white/30"
      >
        <RefreshCw className="h-4 w-4" />
        Reconnect
      </button>
    </div>
  );
}
