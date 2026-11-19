-- The automation runner's state (automation-service/), one row per account.
--
-- The runner writes it with the service-role key while it sweeps: what it is
-- doing, recent log lines, and whether it is paused at a security checkpoint
-- (CAPTCHA, 2FA) waiting for a person. The site reads it and clears a
-- checkpoint only through the two owner-only functions below; the browser
-- roles get no table access at all, so nothing else can read or change it.
--
-- Collections the runner makes are NOT stored here: it logs them as ordinary
-- collection_events rows (device_id 'automation-runner'), so the deck's
-- timers, history and streaks treat them like any other collect.

CREATE TABLE IF NOT EXISTS public.automation_runner (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'IDLE'
    CHECK (status IN ('IDLE', 'RUNNING', 'WAITING_JITTER', 'HITL_PAUSED', 'COMPLETED', 'ERROR')),
  current_site text,
  step text,
  completed_count integer NOT NULL DEFAULT 0,
  total_count integer NOT NULL DEFAULT 0,
  next_action_at timestamptz,
  recent_logs jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- The checkpoint the runner is paused at, if any.
  needs_intervention boolean NOT NULL DEFAULT false,
  intervention_site text,
  intervention_reason text,
  intervention_at timestamptz,
  -- Set by runner_clear_checkpoint(); the runner resumes when this is later
  -- than intervention_at.
  clear_requested_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_runner ENABLE ROW LEVEL SECURITY;
-- No policies and no grants: only the service role (the runner) and the
-- SECURITY DEFINER functions below touch the table.
REVOKE ALL ON public.automation_runner FROM PUBLIC, anon, authenticated;
-- The runner's key: read for "clear checkpoint", upsert for its status.
GRANT SELECT, INSERT, UPDATE ON public.automation_runner TO service_role;

-- The owner's runner, or no row.
CREATE OR REPLACE FUNCTION public.runner_status()
RETURNS TABLE (
  status text,
  current_site text,
  step text,
  completed_count integer,
  total_count integer,
  next_action_at timestamptz,
  recent_logs jsonb,
  needs_intervention boolean,
  intervention_site text,
  intervention_reason text,
  intervention_at timestamptz,
  clear_requested_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT r.status, r.current_site, r.step, r.completed_count, r.total_count,
         r.next_action_at, r.recent_logs, r.needs_intervention,
         r.intervention_site, r.intervention_reason, r.intervention_at,
         r.clear_requested_at, r.updated_at
  FROM public.automation_runner AS r
  WHERE r.user_id = auth.uid()
    AND public.is_owner();
$$;

-- Marks the owner's current checkpoint cleared. Returns whether there was
-- one to clear.
CREATE OR REPLACE FUNCTION public.runner_clear_checkpoint()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  cleared integer;
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'OWNER_ONLY';
  END IF;
  UPDATE public.automation_runner
     SET clear_requested_at = now(),
         updated_at = now()
   WHERE user_id = auth.uid()
     AND needs_intervention;
  GET DIAGNOSTICS cleared = ROW_COUNT;
  RETURN cleared > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.runner_status() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.runner_clear_checkpoint() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.runner_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.runner_clear_checkpoint() TO authenticated;
