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
  const [effectiveDate, setEffectiveDate] = useState<string | null>(null);
  const [initError, setInitError] = useState("");
  const [isPaymentReady, setIsPaymentReady] = useState(false);

  const planName = searchParams.get("name") || "Unknown Plan";
  const amountCents = searchParams.get("amount");
  const priceId = searchParams.get("price_id");
  const studentId = searchParams.get("studentId");
  const mode = searchParams.get("mode") === "schedule" ? "schedule" : "purchase";

  // New-user signup params (only present when studentId === "new")
  const pFName = searchParams.get("pFName");
  const pLName = searchParams.get("pLName");
  const sFName = searchParams.get("sFName");
  const sLName = searchParams.get("sLName");
  const email = searchParams.get("email");
  const password = searchParams.get("password");

  const amountDisplay = amountCents
    ? `$${(Number.parseInt(amountCents, 10) / 100).toFixed(0)}`
    : "0";

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
        const endpoint =
          mode === "schedule" ? "/api/subscriptions/schedule" : "/api/checkout";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            priceId,
            studentId,
            pFName,
            pLName,
            sFName,
            sLName,
            email,
            password,
          }),
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
          setEffectiveDate(data.effectiveDate ?? null);
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
  }, [priceId, mode]);

  if (initError) {
    return (
      <div className={containerClass}>
        <div className="text-[#ff6b6b] font-bold text-base p-8">
          {initError}
        </div>
      </div>
    );
  }

  const showSpinner = !clientSecret || !amountCents || !isPaymentReady;

  return (
    <>
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
              mode={mode}
              effectiveDate={effectiveDate}
              onPaymentElementReady={() => setIsPaymentReady(true)}
              studentId={studentId}
            />
          </Elements>
        </div>
      )}

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
