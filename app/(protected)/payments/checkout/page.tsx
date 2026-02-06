'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from './checkout.module.css';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // --- FORM STATE ---
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  // New state for Card Fields (So you can type)
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  // Get data from URL
  const planName = searchParams.get('name') || 'Unknown Plan';
  const priceId = searchParams.get('price_id');
  const amountCents = searchParams.get('amount');
  
  const amountDisplay = amountCents 
    ? `$${(parseInt(amountCents) / 100).toFixed(0)}` 
    : '0';

  const handleProceedToPayment = async () => {
    setLoading(true);
    try {
      // Note: Since we are using Stripe Hosted Checkout (redirect),
      // the card details typed here won't be sent automatically. 
      // To send these details, we would need to switch to "Stripe Elements".
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, email }),
      });
      const data = await response.json();
      if (data.url) window.location.assign(data.url);
      else alert('Something went wrong.');
    } catch (error) {
      console.error(error);
      alert('Failed to connect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        
        {/* LEFT COLUMN */}
        <div className={styles.leftColumn}>
            <button onClick={() => router.back()} className={styles.backButton}>
                <span style={{ marginRight: '8px', fontSize: '18px' }}>‹</span> Return to package options
            </button>

            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>Overview</h1>

            <div className={styles.overviewCard}>
                <h2 className={styles.overviewTitle}>TalkMaze Package Renewal:</h2>
                
                <div className={styles.innerWhiteCard}>
                    <div className={styles.planText}>
                        {planName} &nbsp;|&nbsp; {amountDisplay} (CA)
                    </div>
                    <span style={{ cursor: 'pointer', fontSize: '18px' }}>🗑️</span>
                </div>
                
                <div className={styles.detailsLink}>
                    See more details
                </div>
            </div>

            {/* Billing History Stub */}
            <div className={styles.billingHistory}>
                <span>Billing History <span style={{ fontWeight: 'normal', color: '#666', fontSize: '12px' }}>expand</span></span>
                <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: '#666' }}>
                    <span>Date</span>
                    <span>Invoice #</span>
                    <span>Amount</span>
                </div>
            </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className={styles.rightColumn}>
            
            <h3 className={styles.sectionTitle}>Contact Information</h3>
            
            <div className={styles.inputRow}>
                <select className={styles.inputField} style={{ width: '40%' }}>
                    <option>1+ United States</option>
                    <option>1+ Canada</option>
                </select>
                <input type="text" placeholder="Phone Number *" className={styles.inputField} />
            </div>

            <div className={styles.inputGroup}>
                <input 
                    type="email" 
                    placeholder="Email Address for Receipt *" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={styles.inputField} 
                />
            </div>

            <div className={styles.inputRow}>
                <input 
                    type="text" 
                    placeholder="First Name *" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={styles.inputField} 
                />
                <input 
                    type="text" 
                    placeholder="Last Name *" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={styles.inputField} 
                />
            </div>

            <hr className={styles.divider} />

            <h3 className={styles.sectionTitle}>Payment</h3>
            
            <div className={styles.paymentOptions}>
                <div className={`${styles.paymentOption} ${styles.activeOption}`}>Card</div>
                <div className={styles.paymentOption}>PayPal</div>
                <div className={styles.paymentOption}>Google Pay</div>
                <div className={styles.paymentOption} style={{ flex: 'none', width: '40px' }}>...</div>
            </div>

            {/* --- UPDATED CARD INPUTS (Enabled) --- */}
            <div className={styles.inputGroup}>
                <input 
                    type="text" 
                    placeholder="Card Holder *" 
                    className={styles.inputField}
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                />
            </div>
            <div className={styles.inputGroup}>
                <input 
                    type="text" 
                    placeholder="Card Number *" 
                    className={styles.inputField}
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                />
            </div>
            <div className={styles.inputRow}>
                <input 
                    type="text" 
                    placeholder="MM/YY *" 
                    className={styles.inputField}
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                />
                <input 
                    type="text" 
                    placeholder="CVC *" 
                    className={styles.inputField}
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                />
            </div>

            <hr className={styles.divider} />

            <div className={styles.inputGroup}>
                <input type="text" placeholder="Coupon Code" className={styles.inputField} />
            </div>

            <div className={styles.checkboxRow}>
                <input type="checkbox" id="saveInfo" style={{ width: '18px', height: '18px' }} />
                <label htmlFor="saveInfo">Save this payment for future purchases</label>
            </div>

            <button 
                onClick={handleProceedToPayment}
                disabled={loading}
                className={styles.purchaseButton}
            >
                {loading ? 'Processing...' : `Purchase (${amountDisplay})`}
            </button>

        </div>

      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div style={{ color: 'white', padding: '50px' }}>Loading checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}