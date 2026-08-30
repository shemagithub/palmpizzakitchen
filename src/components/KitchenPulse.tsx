"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Pulse = {
  id: string;
  firstName: string;
  area: string;
  item: string;
  minutesAgo: number | null;
};

export default function KitchenPulse() {
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    void (async () => {
      try {
        const data = await api<{ pulses?: Pulse[] }>("/kitchen/pulse");
        setPulses(data.pulses || []);
      } catch {
        setPulses([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (pulses.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((value) => (value + 1) % pulses.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [pulses.length]);

  const current = pulses[index];
  if (!current) {
    return (
      <p className="text-xs text-pam-muted">
        Open in Kigali · delivery & pickup
      </p>
    );
  }

  return (
    <p className="text-xs text-pam-muted">
      Recent order: {current.item} to {current.area}
      {current.minutesAgo != null ? ` · ${current.minutesAgo} min ago` : ""}
    </p>
  );
}
