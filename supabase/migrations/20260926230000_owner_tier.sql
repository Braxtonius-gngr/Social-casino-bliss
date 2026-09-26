-- The owner tier. One account (the site owner) sits above moderators: it
-- holds every moderator power, it is the only account that can make or
-- unmake moderators, and nothing short of a migration can demote, mute or
-- delete it. Moderators are the people the owner names, by email; an
-- anonymous device can't be one.

ALTER TABLE public.community_profiles
  ADD COLUMN IF NOT EXISTS is_owner BOOLEAN NOT NULL DEFAULT FALSE;

-- At most one owner.
CREATE UNIQUE INDEX IF NOT EXISTS community_profiles_single_owner
  ON public.community_profiles ((TRUE)) WHERE is_owner;

-- The owner's row changes only under a migration (which sets this local
-- setting first). Everything else - the RPCs below included - is refused,
-- and so is any attempt to give a second account the flag.
CREATE OR REPLACE FUNCTION public.community_profiles_guard_owner()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_setting('app.owner_change', TRUE) = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_owner THEN
      RAISE EXCEPTION 'OWNER_ACCOUNT: the owner account cannot be deleted';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.is_owner THEN
    IF NOT NEW.is_owner OR NOT NEW.is_moderator OR NEW.is_flagged THEN
      RAISE EXCEPTION 'OWNER_ACCOUNT: the owner account cannot be demoted, muted or unflagged as owner';
    END IF;
  END IF;
  IF NEW.is_owner AND (TG_OP = 'INSERT' OR NOT OLD.is_owner) THEN
    RAISE EXCEPTION 'OWNER_ACCOUNT: the owner is set by migration only';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.community_profiles_guard_owner() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS community_profiles_guard_owner ON public.community_profiles;
CREATE TRIGGER community_profiles_guard_owner
  BEFORE INSERT OR UPDATE OR DELETE ON public.community_profiles
  FOR EACH ROW EXECUTE FUNCTION public.community_profiles_guard_owner();

-- Seed the owner: the site's admin account, the same address the
-- public_freebies policies and the edge functions check.
DO $$
DECLARE
  owner_id UUID;
BEGIN
  SELECT id INTO owner_id FROM auth.users WHERE lower(email) = 'johndopamine210@gmail.com' LIMIT 1;
  IF owner_id IS NULL THEN
    RAISE NOTICE 'owner account not found; run this migration again once it exists';
    RETURN;
  END IF;
  PERFORM set_config('app.owner_change', 'on', TRUE);
  INSERT INTO public.community_profiles (id, public_alias, is_owner, is_moderator, is_flagged)
  VALUES (owner_id, 'Player-' || substr(replace(owner_id::text, '-', ''), 1, 8), TRUE, TRUE, FALSE)
  ON CONFLICT (id) DO UPDATE SET is_owner = TRUE, is_moderator = TRUE, is_flagged = FALSE;
  PERFORM set_config('app.owner_change', 'off', TRUE);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_profiles AS profile
    WHERE profile.id = auth.uid() AND profile.is_owner = TRUE
  );
$$;

-- The owner is a moderator too, and a mute never applies to the owner.
CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_profiles AS profile
    WHERE profile.id = auth.uid()
      AND (profile.is_owner = TRUE OR (profile.is_moderator = TRUE AND profile.is_flagged = FALSE))
  );
$$;

-- Owner only: who moderates. Emails are shown because the owner names
-- moderators by email; an anonymous moderator has none.
CREATE OR REPLACE FUNCTION public.list_moderators()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  public_alias TEXT,
  is_owner BOOLEAN,
  is_flagged BOOLEAN,
  since TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'OWNER_ONLY: only the owner manages moderators';
  END IF;
  RETURN QUERY
  SELECT p.id, u.email::TEXT, p.public_alias, p.is_owner, p.is_flagged, p.created_at
  FROM public.community_profiles AS p
  JOIN auth.users AS u ON u.id = p.id
  WHERE p.is_owner OR p.is_moderator
  ORDER BY p.is_owner DESC, u.email NULLS LAST;
END;
$$;

-- Owner only: make (or unmake) the account behind an email a moderator.
-- The account must exist and have that email linked; the owner's own
-- account is refused (the guard trigger would refuse it anyway).
CREATE OR REPLACE FUNCTION public.set_moderator(p_email TEXT, p_on BOOLEAN)
RETURNS TABLE (user_id UUID, email TEXT, public_alias TEXT, is_moderator BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target UUID;
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'OWNER_ONLY: only the owner manages moderators';
  END IF;
  SELECT u.id INTO target FROM auth.users AS u
  WHERE lower(u.email) = lower(trim(p_email)) LIMIT 1;
  IF target IS NULL THEN
    RAISE EXCEPTION 'NO_SUCH_EMAIL: no account has linked that email';
  END IF;
  IF EXISTS (SELECT 1 FROM public.community_profiles AS p WHERE p.id = target AND p.is_owner) THEN
    RAISE EXCEPTION 'OWNER_ACCOUNT: the owner is always a moderator';
  END IF;

  INSERT INTO public.community_profiles (id, public_alias, is_moderator)
  VALUES (target, 'Player-' || substr(replace(target::text, '-', ''), 1, 8), p_on)
  ON CONFLICT (id) DO UPDATE SET is_moderator = EXCLUDED.is_moderator;

  RETURN QUERY
  SELECT p.id, u.email::TEXT, p.public_alias, p.is_moderator
  FROM public.community_profiles AS p JOIN auth.users AS u ON u.id = p.id
  WHERE p.id = target;
END;
$$;

REVOKE ALL ON FUNCTION public.is_owner() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_moderators() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_moderator(TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_moderators() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_moderator(TEXT, BOOLEAN) TO authenticated;

-- Self-serve deletion never removes the owner or a moderator.
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller UUID := auth.uid();
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'NOT_SIGNED_IN: sign in first';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_subscriptions AS s
    WHERE s.user_id = caller
      AND s.stripe_subscription_id IS NOT NULL
      AND s.status::TEXT NOT IN ('canceled', 'incomplete_expired')
  ) THEN
    RAISE EXCEPTION 'ACTIVE_SUBSCRIPTION: cancel the Pro subscription first; once it has ended the account can be deleted';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.community_profiles AS p
    WHERE p.id = caller AND p.is_owner
  ) THEN
    RAISE EXCEPTION 'OWNER_ACCOUNT: the owner account is not deleted here';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.community_profiles AS p
    WHERE p.id = caller AND p.is_moderator
  ) THEN
    RAISE EXCEPTION 'MODERATOR_ACCOUNT: moderator accounts are not deleted here';
  END IF;

  DELETE FROM auth.users WHERE id = caller;
END;
$$;
