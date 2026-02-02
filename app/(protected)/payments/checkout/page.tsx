'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
// Note: We use ../../ to go up two levels to find the css file
import styles from '../payments.module.css';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  // Get data from URL
  const planName = searchParams.get('name');
  const priceId = searchParams.get('price_id');
  const amountCents = searchParams.get('amount');
  
  const amountDisplay = amountCents 
    ? `$${(parseInt(amountCents) / 100).toFixed(2)}` 
    : '$0.00';

  const handleProceedToPayment = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });

      const data = await response.json();
      
      if (data.url) {
        window.location.assign(data.url);
      } else {
        alert('Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert('Failed to connect to payment server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.paymentPageContainer}>
       <div className="bg-white p-8 rounded-lg shadow-lg max-w-md mx-auto mt-10 text-black">
         <h1 className="text-2xl font-bold mb-6">Checkout Summary</h1>
         
         <div className="border-b pb-4 mb-4">
           <p className="text-gray-600">Selected Plan</p>
           <p className="text-xl font-bold">{planName}</p>
         </div>

         <div className="flex justify-between items-center text-xl font-bold mb-8">
           <span>Total Due:</span>
           <span>{amountDisplay}</span>
         </div>

         <button 
           onClick={handleProceedToPayment}
           disabled={loading}
           className={styles.continuePaymentButton}
           style={{ width: '100%', opacity: loading ? 0.7 : 1 }}
         >
           {loading ? 'Processing...' : 'Pay Now with Stripe'}
         </button>
       </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div>Loading checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}