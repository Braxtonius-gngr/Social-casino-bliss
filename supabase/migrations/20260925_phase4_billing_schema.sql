-- Phase 4 billing schema, retry-safe webhook ledger, and entitlements.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE public.subscription_tier_type AS ENUM ('free', 'pro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.subscription_status_type AS ENUM (
    'active', 'trialing', 'past_due', 'canceled', 'incomplete',
    'incomplete_expired', 'unpaid'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.webhook_process_status AS ENUM ('pending', 'processed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255) UNIQUE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  tier public.subscription_tier_type NOT NULL DEFAULT 'free',
  status public.subscription_status_type NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_customer
  ON public.user_subscriptions (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_subscription
  ON public.user_subscriptions (stripe_subscription_id);

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) NOT NULL UNIQUE,
  event_type VARCHAR(128) NOT NULL,
  process_status public.webhook_process_status NOT NULL DEFAULT 'pending',
  payload JSONB NOT NULL,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_id
  ON public.stripe_webhook_events (event_id);

CREATE OR REPLACE VIEW public.my_entitlements AS
SELECT
  tier,
  status,
  current_period_end,
  cancel_at_period_end,
  (
    tier = 'pro'
    AND status IN ('active', 'trialing')
    AND (current_period_end IS NULL OR current_period_end > timezone('utc', now()))
  ) AS is_pro_active
FROM public.user_subscriptions
WHERE user_id = auth.uid();

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_subscriptions_owner_read ON public.user_subscriptions;
CREATE POLICY user_subscriptions_owner_read
  ON public.user_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON TABLE public.user_subscriptions FROM anon, authenticated;
REVOKE ALL ON TABLE public.stripe_webhook_events FROM anon, authenticated;
GRANT SELECT ON TABLE public.user_subscriptions TO authenticated;
GRANT SELECT ON public.my_entitlements TO authenticated;

DROP FUNCTION IF EXISTS public.get_my_entitlement();
CREATE OR REPLACE FUNCTION public.get_my_entitlement()
RETURNS TABLE (
  tier TEXT,
  status TEXT,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN,
  is_pro_active BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    subscription.tier::TEXT,
    subscription.status::TEXT,
    subscription.current_period_end,
    subscription.cancel_at_period_end,
    (
      subscription.tier::TEXT = 'pro'
      AND subscription.status::TEXT IN ('active', 'trialing')
      AND (
        subscription.current_period_end IS NULL
        OR subscription.current_period_end > timezone('utc', now())
      )
    ) AS is_pro_active
  FROM public.user_subscriptions AS subscription
  WHERE subscription.user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_entitlement() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_entitlement() TO authenticated;
