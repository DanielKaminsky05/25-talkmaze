import { redirect } from "next/navigation";
import SuccessClient from "./SuccessClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Payment Successful" };

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
