-- Moderator-only queue reads and state transitions for the Phase 3 console.
-- Raw community tables remain inaccessible to browser roles.

CREATE OR REPLACE FUNCTION public.fetch_pending_drop_submissions()
RETURNS TABLE (
  id UUID,
  platform_id TEXT,
  platform_name TEXT,
  bucket TEXT,
  code_value TEXT,
  claim_url TEXT,
  root_domain TEXT,
  terms TEXT,
  expires_at TIMESTAMPTZ,
  source_note TEXT,
  submitted_by UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_moderator() THEN
    RAISE EXCEPTION 'Moderator access required';
  END IF;

  RETURN QUERY
  SELECT drop.id, drop.platform_id, drop.platform_name, drop.bucket,
    drop.code_value, drop.claim_url, drop.root_domain, drop.terms,
    drop.expires_at, drop.source_note, drop.submitted_by, drop.created_at
  FROM public.drop_submissions AS drop
  WHERE drop.status = 'pending'
  ORDER BY drop.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.fetch_open_drop_reports()
RETURNS TABLE (
  id UUID,
  drop_id UUID,
  reason public.report_reason_type,
  detail TEXT,
  created_at TIMESTAMPTZ,
  platform_name TEXT,
  claim_url TEXT,
  code_value TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_moderator() THEN
    RAISE EXCEPTION 'Moderator access required';
  END IF;

  RETURN QUERY
  SELECT report.id, report.drop_id, report.reason, report.detail,
    report.created_at, drop.platform_name, drop.claim_url, drop.code_value
  FROM public.drop_reports AS report
  JOIN public.drop_submissions AS drop ON drop.id = report.drop_id
  WHERE report.status = 'open'
  ORDER BY report.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.moderate_drop_submission(
  p_drop_id UUID,
  p_new_status public.drop_status_type,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_moderator() THEN
    RAISE EXCEPTION 'Moderator access required';
  END IF;
  IF p_new_status NOT IN ('published', 'rejected') THEN
    RAISE EXCEPTION 'Invalid moderation status';
  END IF;
  IF length(coalesce(p_reason, '')) > 1000 THEN
    RAISE EXCEPTION 'Moderation reason is too long';
  END IF;

  UPDATE public.drop_submissions
  SET status = p_new_status,
      moderation_reason = nullif(trim(p_reason), '')
  WHERE id = p_drop_id
    AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending drop not found';
  END IF;

  INSERT INTO public.moderation_actions (target_id, target_type, actor_id, action, reason)
  VALUES (
    p_drop_id, 'drop', auth.uid(),
    CASE WHEN p_new_status = 'published' THEN 'approve'::public.moderation_action_type
         ELSE 'reject'::public.moderation_action_type END,
    nullif(trim(p_reason), '')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.moderate_redemption_report(
  p_report_id UUID,
  p_new_status public.drop_status_type,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_moderator() THEN
    RAISE EXCEPTION 'Moderator access required';
  END IF;
  IF p_new_status NOT IN ('published', 'rejected') THEN
    RAISE EXCEPTION 'Invalid moderation status';
  END IF;
  IF length(coalesce(p_reason, '')) > 1000 THEN
    RAISE EXCEPTION 'Moderation reason is too long';
  END IF;

  UPDATE public.redemption_reports
  SET status = p_new_status
  WHERE id = p_report_id
    AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending redemption report not found';
  END IF;

  INSERT INTO public.moderation_actions (target_id, target_type, actor_id, action, reason)
  VALUES (
    p_report_id, 'redemption', auth.uid(),
    CASE WHEN p_new_status = 'published' THEN 'approve'::public.moderation_action_type
         ELSE 'reject'::public.moderation_action_type END,
    nullif(trim(p_reason), '')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fetch_pending_drop_submissions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fetch_open_drop_reports() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.moderate_drop_submission(UUID, public.drop_status_type, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.moderate_redemption_report(UUID, public.drop_status_type, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_moderator() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.fetch_pending_drop_submissions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fetch_open_drop_reports() TO authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_drop_submission(UUID, public.drop_status_type, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_redemption_report(UUID, public.drop_status_type, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_moderator() TO authenticated;
