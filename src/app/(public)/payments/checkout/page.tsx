import { Suspense } from "react";
import { CheckoutPageClient } from "./_components/CheckoutPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CheckoutPageClient />
    </Suspense>
  );
}
