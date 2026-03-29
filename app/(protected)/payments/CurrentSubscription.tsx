// File: app/payments/CurrentSubscription.tsx
import React from 'react';
import { createClient } from '@/utils/supabase/client';
import styles from './payments.module.css';

async function getCurrentSubscription() {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('student_subscriptions')
        .select(`
            *,
            plans (
                id,
                name,
                description,
                renewal,
                currency,
                cents,
                classes,
                type
            )
        `)
        .eq('student_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error || !data) return null;
    return data;
}

export default async function CurrentSubscription() {
    const subscription = await getCurrentSubscription();

    if (!subscription) {
        return <div className={styles.currentSubCard}>No active subscription found.</div>;
    }

    const daysLeft = subscription.current_period_end
        ? Math.max(0, Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null;

    return (
        <div className={styles.currentSubCard}>
            <div className={styles.subPackageDetails}>
                <h3>{subscription.plans?.name}</h3>
                <p>{subscription.plans?.description}</p>
            </div>

            <div className={styles.subStatusBox}>
                {daysLeft !== null && (
                    <p className={styles.subStatusText}>
                        You have <strong>{daysLeft}</strong> days remaining in your current billing period
                    </p>
                )}

                <div className={styles.sessionStatusContainer}>
                    <div className={styles.sessionProgressCircle}>
                        <div className={styles.sessionProgressInner}></div>
                    </div>
                    <p className={styles.sessionCount}>
                        <strong>{subscription.classes_left}</strong> Classes Left in Payment Package
                    </p>
                </div>

                <button className={styles.cancelPlanButton}>
                    Cancel plan
                </button>
            </div>
        </div>
    );
}