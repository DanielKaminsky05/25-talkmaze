import { getCurrentUser } from "@/src/lib/auth/server/getCurrentUser";
import CoachCalendarClient from "./CoachCalendarClient";

export default async function CoachCalendarPage() {
  const user = await getCurrentUser();
  if (!user) throw new Error("User not found");
  return <CoachCalendarClient />;
}
