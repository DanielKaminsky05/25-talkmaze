import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { RenewalCardsContainer } from './RenewalCards';
import CurrentSubscription from './CurrentSubscription';
import styles from './payments.module.css';

// 1. ADD THIS: TypeScript needs to know what a Plan looks like in this file too
interface Plan {
  id: string
  name: string
  classe
}

export default async function PaymentPage() {
  // 2. FIX: Add 'await' here because createClient is asynchronous on the server
  const supabase = await createClient(); 

  // 3. FIX: Cast the result so the 'plans' variable isn't 'any'
  const { data: plans } = await supabase
    .from('Plans')
    .select('*') as { data: Plan[] | null };
    return (
    <div className={styles.paymentPageContainer}>
      <header className={styles.pageHeader}>
        <a href="/dashboard" className={styles.returnLink}>&lt; Return to Dashboard</a>
      </header>

      <main className={styles.mainContent}>
        <h2 className={styles.sectionTitle}>Current subscription in progress</h2>
        <CurrentSubscription />

        <h2 className={styles.sectionTitle}>TalkMaze Package Renewal Options</h2>
        <RenewalCardsContainer renewalOptions={plans || []} />

        <div className={styles.continuePaymentContainer}>
          <button className={styles.continuePaymentButton}>
            Continue to payment &gt;
          </button>
        </div>
      </main>
    </div>
  );
}