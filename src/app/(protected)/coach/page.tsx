import { redirect } from "next/navigation";

export default function CoachPage() {
  // No standalone home dashboard yet; land on the students split view, which
  // shows the list + an empty "select a student" state.
  redirect("/coach/students");
}
