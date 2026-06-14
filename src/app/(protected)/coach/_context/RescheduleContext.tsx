"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { getPendingRescheduleState } from "@/src/lib/scheduling/actions/getPendingRescheduleState";

type RescheduleContextValue = {
  /** Pending reschedule requests addressed to the current coach. */
  pendingCount: number;
  /** Refetch the count from the server (e.g. after approving/declining). */
  refetch: () => void;
};

const RescheduleContext = createContext<RescheduleContextValue>({
  pendingCount: 0,
  refetch: () => {},
});

/**
 * Holds the coach's pending reschedule-request count for the sidebar badge and
 * keeps it current.
 *
 * Today the count is server-seeded (no flash) and refetched whenever the coach
 * navigates — which covers approving/declining a request and then leaving the
 * page. The structure deliberately mirrors `UnreadMessagesProvider`: when the realtime
 * infra lands (a `sessions` trigger broadcasting to a `coach:<id>:reschedule`
 * channel + `realtime.messages` RLS), subscribe here and call `refetch()` on
 * each ping — nothing else needs to change.
 */
export function RescheduleProvider({
  initialCount,
  children,
}: {
  initialCount: number;
  children: ReactNode;
}) {
  const [pendingCount, setPendingCount] = useState(initialCount);
  const pathname = usePathname();

  const refetch = useCallback(() => {
    getPendingRescheduleState()
      .then(({ pending }) => setPendingCount(pending))
      .catch((err) =>
        console.error("Failed to refresh reschedule count:", err),
      );
  }, []);

  // Keep the badge fresh as the coach moves around the dashboard (the seed
  // covers the first paint; this catches changes made on the requests page).
  useEffect(() => {
    refetch();
  }, [pathname, refetch]);

  return (
    <RescheduleContext.Provider value={{ pendingCount, refetch }}>
      {children}
    </RescheduleContext.Provider>
  );
}

export function usePendingReschedules() {
  return useContext(RescheduleContext);
}
