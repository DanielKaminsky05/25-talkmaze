export type AdminPlan = {
  id: string;
  name: string;
  description: string | null;
  cents: number;
  classes: number;
  currency: string;
  stripe_price_id: string;
  renewal: string;
  type: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  // enriched from Stripe
  stripe_product_name?: string;
  stripe_amount?: number | null;
  stripe_currency?: string;
  stripe_interval?: string | null;
  stripe_interval_count?: number | null;
};
