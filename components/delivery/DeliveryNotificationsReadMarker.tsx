"use client";

import { useEffect } from "react";

export function DeliveryNotificationsReadMarker({ ids }: { ids: string[] }) {
  const joinedIds = ids.join(",");

  useEffect(() => {
    if (!joinedIds) {
      return;
    }

    void fetch("/api/delivery/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: joinedIds.split(",") }),
    });
  }, [joinedIds]);

  return null;
}
