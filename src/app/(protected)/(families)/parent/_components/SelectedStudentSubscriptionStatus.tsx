"use client";

import Link from "next/link";
import SessionsRemainingDonutChart from "@/src/components/common/charts/SessionsRemainingDonutChart";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";

interface SelectedStudentSubscriptionStatusProps {
  sessionsLeft?: number;
  totalSessions?: number;
  studentId?: string;
  subscriptionStatus?: string;
}

/**
 * Displays the subscription status of the selected student.
 */
export default function SelectedStudentSubscriptionStatus({
  sessionsLeft = 0,
  totalSessions = 0,
  studentId,
  subscriptionStatus = "inactive",
}: SelectedStudentSubscriptionStatusProps) {
  const paymentHref = studentId
    ? `/payments?studentId=${studentId}`
    : "/payments";

  return (
    <Card
      variant="light"
      shadow="md"
      padding="none"
      className="rounded-2xl overflow-hidden border-4 border-[#B1E7D6] sm:flex-row min-h-44.5 sm:h-44.5"
    >
      {subscriptionStatus === "active" ? (
        <>
          {/* Left section - Donut Chart */}
          <div
            className="flex items-center justify-center w-full sm:w-[225px] sm:shrink-0"
          >
            <SessionsRemainingDonutChart
              sessionsRemaining={sessionsLeft ?? 0}
              totalSessions={totalSessions}
            />
          </div>

          {/* Right section */}
          <div className="bg-accent flex-1 flex flex-col items-center sm:items-end justify-center gap-3 sm:gap-6 p-4 sm:pr-6 sm:p-0 rounded-r-xl">
            <p
              className="font-semibold text-[20px] text-[#2B4257] text-center sm:text-right"
              style={{ fontFamily: "Roboto, sans-serif" }}
            >
              <span className="text-[#D55B40]">{sessionsLeft ?? 0}</span>
              {" Sessions Left in Payment Package"}
            </p>
            <Button asChild variant="dark" rounded="xl" className="w-36.75 h-9.75 text-base">
              <Link href={paymentHref}>Renew Now</Link>
            </Button>
          </div>
        </>
      ) : (
        /* Full-width green section — no donut chart */
        <div className="bg-accent flex-1 flex flex-col items-start justify-center gap-4 pl-8 rounded-xl">
          <div>
            <p
              className="font-semibold text-[20px] text-[#2B4257]"
              style={{ fontFamily: "Roboto, sans-serif" }}
            >
              No Active Subscription
            </p>
            <p
              className="text-[14px] text-[#2B4257] opacity-70 mt-1"
              style={{ fontFamily: "Roboto, sans-serif" }}
            >
              Subscribe to book coaching sessions
            </p>
          </div>
          <Button asChild variant="dark" rounded="xl" className="w-36.75 h-9.75 text-base">
            <Link href={paymentHref}>Subscribe Now</Link>
          </Button>
        </div>
      )}
    </Card>
  );
}
