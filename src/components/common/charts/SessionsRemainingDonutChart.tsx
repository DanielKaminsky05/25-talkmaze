"use client";

import { useEffect, useRef } from "react";
import { Chart, ArcElement, DoughnutController, Tooltip } from "chart.js";

Chart.register(ArcElement, DoughnutController, Tooltip);

interface DonutChartProps {
  sessionsRemaining: number;
  totalSessions: number;
}

/**
 * Donut chart displaying the number of sessions the student has used, out of
 * the total sessions given to them by their subscription plan
 * 
 * @param sessionsRemaining remaining coach sessions the student can schedule
 * @param totalSessions total sessions the student can book within their subscription
 */
export default function SessionsRemainingDonutChart({
  sessionsRemaining,
  totalSessions,
}: DonutChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const remaining = Math.max(0, sessionsRemaining);
    const used = Math.max(0, totalSessions - sessionsRemaining);

    const chart = new Chart(canvasRef.current, {
      type: "doughnut",
      data: {
        datasets: [
          {
            data: [remaining, used],
            backgroundColor: ["#d55b40", "#1f2e3b"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        cutout: "20%",
        responsive: false,
        plugins: {
          tooltip: { enabled: false },
          legend: { display: false },
        },
      },
    });

    return () => {
      chart.destroy();
    };
  }, [sessionsRemaining, totalSessions]);

  return (
    <div style={{ width: 130, height: 130, flexShrink: 0 }}>
      <canvas ref={canvasRef} width={130} height={130} />
    </div>
  );
}
