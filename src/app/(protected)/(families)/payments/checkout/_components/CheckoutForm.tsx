"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { OverviewPanel } from "./OverviewPanel";
import { ContactInfoSection } from "./ContactInfoSection";
import { CaretIcon } from "@/src/components/ui/icons";

export function CheckoutForm({
  amountDisplay,
  planName,
  prefill,
  studentId,
  mode = "purchase",
  effectiveDate,
  onPaymentElementReady,
}: {
  amountDisplay: string;
  planName: string;
  prefill?: { name: string; email: string; phone: string } | null;
  studentId: string | null;
  mode?: "purchase" | "schedule";
  effectiveDate?: string | null;
  onPaymentElementReady?: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isSchedule = mode === "schedule";

  const formattedEffectiveDate = effectiveDate
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(effectiveDate))
    : null;

  useEffect(() => {
    if (!prefill) return;
    const parts = prefill.name.trim().split(" ");
    setFirstName(parts[0] ?? "");
    setLastName(parts.slice(1).join(" "));
    setEmail(prefill.email);
    setPhone(prefill.phone.replace(/^\+1/, ""));
  }, [prefill]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setErrorMessage("");

    const billingDetails = {
      name: `${firstName} ${lastName}`.trim(),
      email,
      phone,
    };

    const returnUrl = isSchedule
      ? `${window.location.origin}/payments/success?mode=schedule`
      : `${window.location.origin}/payments/success`;

    const { error } = isSchedule
      ? await stripe.confirmSetup({
          elements,
          confirmParams: {
            return_url: returnUrl,
            payment_method_data: { billing_details: billingDetails },
          },
        })
      : await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: returnUrl,
            receipt_email: email,
            payment_method_data: { billing_details: billingDetails },
          },
        });

    if (error) {
      setErrorMessage(error.message ?? "Payment failed");
      setLoading(false);
    }
  };

  return (
    <>
      <header className="bg-[#2b4257] px-8 py-5 flex items-center">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 bg-[#1f2e3b] text-white text-[1rem] font-semibold px-5 py-2.5 rounded-full shadow-[0_4px_8px_rgba(0,0,0,0.25)] hover:bg-[#162230] transition-colors border-0 cursor-pointer"
        >
          <CaretIcon direction="left" />
          Return to package options
        </button>
      </header>

      <div className="mx-8 mb-10 px-4 flex-1 grid grid-cols-1 lg:grid-cols-[5fr_5fr] gap-6">
        <OverviewPanel
          planName={planName}
          amountDisplay={amountDisplay}
          mode={mode}
          effectiveDate={formattedEffectiveDate}
        />

        <form
          onSubmit={handleSubmit}
          className="bg-[#b1e7d6] rounded-[20px] p-10 text-[#111827] shadow-[0_10px_25px_rgba(0,0,0,0.2)]"
        >
          <ContactInfoSection
            phone={phone}
            setPhone={setPhone}
            email={email}
            setEmail={setEmail}
            firstName={firstName}
            setFirstName={setFirstName}
            lastName={lastName}
            setLastName={setLastName}
          />

          <hr className="border-0 border-t border-[#9CA3AF] my-[30px]" />

          <h3 className="text-2xl font-bold text-[#2b4257] mt-0 mb-[15px]">
            Payment
          </h3>

          {isSchedule && formattedEffectiveDate && (
            <div className="mb-4 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-[#2b4257]">
              No charge today. Your new plan starts on {formattedEffectiveDate}.
            </div>
          )}

          <div className="mb-5">
            <PaymentElement
              onReady={onPaymentElementReady}
              onLoadError={(event) => {
                console.error("PaymentElement load error:", event);
                setErrorMessage(
                  "Failed to load payment form. This may be caused by an ad blocker. Please disable it for this page and refresh.",
                );
              }}
              options={{
                fields: {
                  billingDetails: {
                    name: "never",
                    email: "never",
                    phone: "never",
                  },
                },
                wallets: { link: "never" },
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
            <div className="text-[#ff6b6b] mb-[15px] font-bold">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={!stripe || loading}
            className="w-full bg-white text-black font-bold text-2xl py-[15px] rounded-[36px] border-0 cursor-pointer mt-[10px] shadow-[0_4px_6px_rgba(0,0,0,0.1)] transition-transform duration-100 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading
              ? "Processing..."
              : isSchedule
                ? `Confirm plan change (${amountDisplay}/mo)`
                : `Purchase (${amountDisplay})`}
          </button>
        </form>
      </div>
    </>
  );
}
