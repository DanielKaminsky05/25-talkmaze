import { Suspense } from "react";
import { CheckoutPageClient } from "./_components/CheckoutPageClient";

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CheckoutPageClient />
    </Suspense>
  );
}
