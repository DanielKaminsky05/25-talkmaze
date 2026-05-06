"use client";

import Link from "next/link";
import SessionsRemainingDonutChart from "@/src/components/common/charts/SessionsRemainingDonutChart";

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
    <div
      className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_4px_rgba(0,0,0,0.25)] border-4 border-[#B1E7D6] flex flex-row"
      style={{ height: "178px" }}
    >
      {subscriptionStatus === "active" ? (
        <>
          {/* Left — donut chart on white bg */}
          <div
            className="flex items-center justify-center"
            style={{ width: "225px", flexShrink: 0 }}
          >
            <SessionsRemainingDonutChart
              sessionsRemaining={sessionsLeft ?? 0}
              totalSessions={totalSessions}
            />
          </div>

          {/* Right — green section */}
          <div className="bg-[#B1E7D6] flex-1 flex flex-col items-end justify-center gap-6 pr-6 rounded-r-xl">
            <p
              className="font-semibold text-[20px] text-[#2B4257] whitespace-nowrap"
              style={{ fontFamily: "Roboto, sans-serif" }}
            >
              <span className="text-[#D55B40]">{sessionsLeft ?? 0}</span>
              {" Sessions Left in Payment Package"}
            </p>
            <Link href={paymentHref}>
              <button
                className="bg-[#1F2E3B] text-white font-semibold text-[16px] rounded-xl hover:bg-[#2B4257] transition-colors"
                style={{
                  width: "147px",
                  height: "39px",
                  fontFamily: "Roboto, sans-serif",
                }}
              >
                Renew Now
              </button>
            </Link>
          </div>
        </>
      ) : (
        /* Full-width green section — no donut chart */
        <div className="bg-[#B1E7D6] flex-1 flex flex-col items-start justify-center gap-4 pl-8 rounded-xl">
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
          <Link href={paymentHref}>
            <button
              className="bg-[#1F2E3B] text-white font-semibold text-[16px] rounded-xl hover:bg-[#2B4257] transition-colors"
              style={{
                width: "147px",
                height: "39px",
                fontFamily: "Roboto, sans-serif",
              }}
            >
              Subscribe Now
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
