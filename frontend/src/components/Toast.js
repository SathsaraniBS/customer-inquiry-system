"use client";

import { useEffect } from "react";

// Confirms an action. Announced to screen readers via role="status".
export default function Toast({ message, onDone, duration = 3500 }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
  }, [message, onDone, duration]);

  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-[#18211f] text-white text-sm px-4 py-2.5 shadow-lg"
    >
      {message}
    </div>
  );
}