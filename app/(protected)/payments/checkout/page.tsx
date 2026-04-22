"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import styles from "./checkout.module.css";

// Initialize the Stripe.js instance once at the file scope (not inside component)
// so it isn't recreated on every render
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

/**
 *Renders the contact info fields and the Stripe PaymentElement.
 *Must be rendered inside an <Elements> provider(which gives the clientSecret)
 */
function CheckoutForm({
  amountDisplay,
  planName,
}: {
  amountDisplay: string;
  planName: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  /**
   * Submits the payment to Stripe.
   * On success, Stripe redirects to return_url with the payment result
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setErrorMessage("");

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payments/success`,
        receipt_email: email,
        // Attach billing details collected from the form fields
        payment_method_data: {
          billing_details: {
            name: `${firstName} ${lastName}`.trim(),
            email,
          },
        },
      },
    });

    // confirmPayment only returns here if there's an error (e.g. card declined).
    // A successful payment redirects the browser to return_url instead.
    if (error) {
      setErrorMessage(error.message ?? "Payment failed");
      setLoading(false);
      return;
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.leftColumn}>
        <button onClick={() => router.back()} className={styles.backButton}>
          <span style={{ marginRight: "8px", fontSize: "18px" }}>‹</span> Return
          to package options
        </button>

        <h1
          style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "10px" }}
        >
          Overview
        </h1>

        <div className={styles.overviewCard}>
          <h2 className={styles.overviewTitle}>TalkMaze Package Renewal:</h2>
          <div className={styles.innerWhiteCard}>
            <div className={styles.planText}>
              {planName} | {amountDisplay} (CA)
            </div>
            <span style={{ cursor: "pointer", fontSize: "18px" }}>🗑️</span>
          </div>
          <div className={styles.detailsLink}>See more details</div>
        </div>

        <div className={styles.billingHistory}>
          <span>
            Billing History{" "}
            <span
              style={{ fontWeight: "normal", color: "#666", fontSize: "12px" }}
            >
              expand
            </span>
          </span>
        </div>
      </div>

      <form className={styles.rightColumn} onSubmit={handleSubmit}>
        <h3 className={styles.sectionTitle}>Contact Information</h3>

        <div className={styles.inputRow}>
          <select className={styles.inputField} style={{ width: "40%" }}>
            <option>1+ United States</option>
            <option>1+ Canada</option>
          </select>
          <input
            type="text"
            placeholder="Phone Number *"
            className={styles.inputField}
          />
        </div>

        <div className={styles.inputGroup}>
          <input
            type="email"
            placeholder="Email Address *"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.inputField}
            required
          />
        </div>

        <div className={styles.inputRow}>
          <input
            type="text"
            placeholder="First Name *"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={styles.inputField}
            required
          />
          <input
            type="text"
            placeholder="Last Name *"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={styles.inputField}
            required
          />
        </div>

        <hr className={styles.divider} />

        <h3 className={styles.sectionTitle}>Payment</h3>

        <div className={styles.inputGroup} style={{ marginBottom: "20px" }}>
          <PaymentElement
            onLoadError={(event) => {
              console.error("PaymentElement load error:", event);
              setErrorMessage(
                "Failed to load payment form. This may be caused by an ad blocker. Please disable it for this page and refresh.",
              );
            }}
            options={{
              layout: {
                type: "accordion",
                defaultCollapsed: false,
                radios: true,
                spacedAccordionItems: false,
              },
            }}
          />
        </div>

        {errorMessage && (
          <div
            style={{
              color: "#ff6b6b",
              marginBottom: "15px",
              fontWeight: "bold",
            }}
          >
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={!stripe || loading}
          className={styles.purchaseButton}
        >
          {loading ? "Processing..." : `Purchase (${amountDisplay})`}
        </button>
      </form>
    </div>
  );
}

/**
 * Reads plan details from URL search params, calls /api/checkout to create a
 * Stripe subscription, then renders the <Elements> provider + <CheckoutForm>
 * once the clientSecret is ready.
 */
function CheckoutPageContent() {
  const searchParams = useSearchParams();
  const [clientSecret, setClientSecret] = useState("");
  const [initError, setInitError] = useState("");

  // Plan details are passed via URL search params from the pricing/packages page
  const planName = searchParams.get("name") || "Unknown Plan";
  const amountCents = searchParams.get("amount");
  const priceId = searchParams.get("price_id");
  const studentId = searchParams.get("studentId");

  // Convert amount from cents (Stripe format) to a display string (e.g. "$49")
  const amountDisplay = amountCents
    ? `$${(Number.parseInt(amountCents, 10) / 100).toFixed(0)}`
    : "0";

  // On mount, hit /api/checkout to create a Stripe subscription and get a clientSecret.
  // The clientSecret contains the configuration of the Stripe subscription, it
  // gets passed to the <Elements>, which renders the payment form for that subscription.
  // The cancelled flag and AbortController prevent state updates after unmount
  // (e.g. if the user navigates away before the /api/checkout request completes)
  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();

    async function init() {
      if (!priceId) {
        setInitError("Missing price_id");
        return;
      }

      try {
        // Display the error message if the checkout form fails to render due
        // to /api/checkout failing to return back a clientSecret.
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

        if (!cancelled) setClientSecret(data.clientSecret);
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
      <div className={styles.container}>
        <div style={{ color: "#ff6b6b", fontWeight: "bold", fontSize: "16px" }}>
          {initError}
        </div>
      </div>
    );
  }

  if (!clientSecret || !amountCents) {
    return (
      <div className={styles.container}>
        <div style={{ color: "white", fontSize: "20px" }}>
          Loading secure payment...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* <Elements> provides the Stripe context (clientSecret + appearance) to all
          child components, enabling useStripe() and useElements() in CheckoutForm */}
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: { theme: "stripe", labels: "floating" },
        }}
      >
        <CheckoutForm amountDisplay={amountDisplay} planName={planName} />
      </Elements>
    </div>
  );
}

// CheckoutPageContent uses useSearchParams(), which requires a Suspense boundary
// when used in the Next.js App Router
export default function CheckoutPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CheckoutPageContent />
    </Suspense>
  );
}
