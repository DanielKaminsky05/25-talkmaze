import { getCurrentUser } from "@/src/lib/auth/server/getCurrentUser";
import RescheduleRequestsClient from "./RescheduleRequestsClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reschedule Requests" };

export default async function CoachRescheduleRequestsPage() {
  const user = await getCurrentUser();
  if (!user) throw new Error("User not found");
  return <RescheduleRequestsClient />;
}
