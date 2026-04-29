"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { CheckoutForm } from "./CheckoutForm";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

const containerClass = "bg-[#2b4257] min-h-screen flex flex-col ";

export function CheckoutPageClient() {
  const searchParams = useSearchParams();
  const [clientSecret, setClientSecret] = useState("");
  const [prefill, setPrefill] = useState<{
    name: string;
    email: string;
    phone: string;
  } | null>(null);
  const [initError, setInitError] = useState("");
  const [isPaymentReady, setIsPaymentReady] = useState(false);

  const planName = searchParams.get("name") || "Unknown Plan";
  const amountCents = searchParams.get("amount");
  const priceId = searchParams.get("price_id");
  const studentId = searchParams.get("studentId");

  const amountDisplay = amountCents
    ? `$${(Number.parseInt(amountCents, 10) / 100).toFixed(0)}`
    : "0";

  // Hit /api/checkout to create a Stripe subscription and get a clientSecret
  // The clientSecret contains the configuration of the Stripe subscription
  // Pass clientSecret to <Elements>, to payment form for that subscription.
  // The cancelled flag and AbortController prevent state updates after unmount,
  // e.g. if the user navigates away before the /api/checkout request completes
  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();

    async function init() {
      if (!priceId) {
        setInitError("Missing price_id");
        return;
      }

      try {
        const timeoutId = setTimeout(() => abortController.abort(), 15000);
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priceId, studentId }),
          signal: abortController.signal,
        });
        clearTimeout(timeoutId);

        const data = await res.json();

        if (!res.ok)
          throw new Error(data?.error || "Failed to initialize checkout");
        if (!data?.clientSecret) throw new Error("No client secret returned");

        if (!cancelled) {
          setClientSecret(data.clientSecret);
          setPrefill(data.prefill ?? null);
        }
      } catch (e) {
        if (cancelled) return;

        if (e instanceof Error && e.name === "AbortError") {
          setInitError(
            "Checkout initialization timed out. Please refresh and try again.",
          );
          return;
        }

        setInitError(e instanceof Error ? e.message : "Initialization failed");
      }
    }

    init();
    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [priceId]);

  if (initError) {
    return (
      <div className={containerClass}>
        <div className="text-[#ff6b6b] font-bold text-base">{initError}</div>
      </div>
    );
  }

  const showSpinner = !clientSecret || !amountCents || !isPaymentReady;

  return (
    <>
      {/* Form renders in background so Stripe can initialize while page
          is still loading. Preventing sudden "pop up" visual bug. */}
      {clientSecret && amountCents && (
        <div className={containerClass}>
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: { theme: "stripe", labels: "floating" },
            }}
          >
            <CheckoutForm
              amountDisplay={amountDisplay}
              planName={planName}
              prefill={prefill}
              onPaymentElementReady={() => setIsPaymentReady(true)}
            />
          </Elements>
        </div>
      )}

      {/* Overlay covers the form until PaymentElement fires onReady */}
      {showSpinner && (
        <div className="fixed inset-0 bg-[#2b4257] flex flex-col items-center justify-center gap-4 z-50">
          <div className="w-12 h-12 border-4 border-[#B1E7D6] border-t-[#65CFAD] rounded-full animate-spin" />
          <p className="text-[#b1e7d6] text-base font-medium">
            Loading secure payment...
          </p>
        </div>
      )}
    </>
  );
}
