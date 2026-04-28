"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { OverviewPanel } from "./OverviewPanel";
import { ContactInfoSection } from "./ContactInfoSection";

export function CheckoutForm({
  amountDisplay,
  planName,
  onPaymentElementReady,
}: {
  amountDisplay: string;
  planName: string;
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

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("Submitting payment!");
    console.log("Amount: " + amountDisplay);
    console.log("Plan Name: " + planName);
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setErrorMessage("");

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payments/success`,
        receipt_email: email,
        payment_method_data: {
          billing_details: {
            name: `${firstName} ${lastName}`.trim(),
            email,
            phone,
          },
        },
      },
    });

    if (error) {
      setErrorMessage(error.message ?? "Payment failed");
      setLoading(false);
      return;
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
          <CaretBack />
          Return to package options
        </button>
      </header>

      <div className="mx-8 mb-10 px-4 flex-1 grid grid-cols-1 lg:grid-cols-[5fr_5fr] gap-6">
        <OverviewPanel planName={planName} amountDisplay={amountDisplay} />

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
                fields: { billingDetails: "never" },
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
            {loading ? "Processing..." : `Purchase (${amountDisplay})`}
          </button>
        </form>
      </div>
    </>
  );
}

function CaretBack() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="26"
      viewBox="0 0 40 46"
      fill="none"
    >
      <path
        d="M13.4503 24.0408L27.3828 39.3071C27.6152 39.5619 27.9241 39.7041 28.2453 39.7041C28.5664 39.7041 28.8753 39.5619 29.1078 39.3071L29.1228 39.2898C29.2358 39.1663 29.3259 39.0176 29.3874 38.8527C29.449 38.6879 29.4807 38.5104 29.4807 38.331C29.4807 38.1516 29.449 37.9741 29.3874 37.8093C29.3259 37.6445 29.2358 37.4958 29.1228 37.3722L16.0028 22.9972L29.1228 8.62795C29.2358 8.50441 29.3259 8.35569 29.3874 8.19086C29.449 8.02603 29.4807 7.84852 29.4807 7.66914C29.4807 7.48976 29.449 7.31226 29.3874 7.14742C29.3259 6.98259 29.2358 6.83388 29.1228 6.71033L29.1078 6.69308C28.8753 6.43822 28.5664 6.29605 28.2453 6.29605C27.9241 6.29605 27.6152 6.43822 27.3828 6.69308L13.4503 21.9593C13.3277 22.0936 13.2302 22.2551 13.1635 22.434C13.0969 22.6129 13.0625 22.8055 13.0625 23.0001C13.0625 23.1947 13.0969 23.3873 13.1635 23.5662C13.2302 23.7451 13.3277 23.9066 13.4503 24.0408Z"
        fill="#65CFAD"
      />
    </svg>
  );
}
