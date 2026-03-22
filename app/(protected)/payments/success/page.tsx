import { redirect } from "next/navigation";
import SuccessClient from "./SuccessClient";

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { redirect_status: redirectStatus } = await searchParams;

  if (redirectStatus !== "succeeded") {
    redirect("/payments/checkout?error=payment_failed");
  }

  return <SuccessClient />;
}
