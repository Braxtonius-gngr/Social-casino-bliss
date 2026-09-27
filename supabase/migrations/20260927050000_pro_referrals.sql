-- Pro referrals and shared lists.
--
-- Free accounts open every platform through the house's referral link.
-- Pro accounts may save their own links, share their platform list by a
-- code, and have their links used by the friends who import it, under
-- three rules the database enforces: both sides must hold Pro at the
-- moment of the click, a sharer's link is never served back to the
-- sharer, and on platforms where the house has a referral link a
-- sharer's links are served at most 20 times a calendar month (on the
-- others they are free). Anyone signed in can import a shared list; the
-- links inside it simply fall back to the house's until both are Pro.

-- ---------------------------------------------------------------------
-- Who counts as Pro: an active or trialing Pro subscription, or the
-- owner. Used by every RPC below and by the `go` redirect.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_pro_user(p_user UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p_user IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.user_subscriptions AS s
      WHERE s.user_id = p_user
        AND s.tier::TEXT = 'pro'
        AND s.status::TEXT IN ('active', 'trialing')
        AND (s.current_period_end IS NULL OR s.current_period_end > timezone('utc', now()))
    )
    OR EXISTS (SELECT 1 FROM public.community_profiles AS p WHERE p.id = p_user AND p.is_owner)
  );
$$;

REVOKE ALL ON FUNCTION public.is_pro_user(UUID) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- Tables. No browser role touches them directly.
-- ---------------------------------------------------------------------
-- A Pro member's own referral links, by platform. The app keeps its own
-- copy for the member's OPEN; this copy is what friends are served.
CREATE TABLE IF NOT EXISTS public.member_links (
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name_key TEXT NOT NULL,
  name TEXT NOT NULL,
  referral_url TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, name_key)
);

-- One shared list per member: the platforms and tags, never links.
CREATE TABLE IF NOT EXISTS public.shared_lists (
  code TEXT PRIMARY KEY,
  owner_id UUID NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  platforms JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- How many times a sharer's links were served this month, counted only
-- on platforms where the house has a referral link of its own.
CREATE TABLE IF NOT EXISTS public.share_link_uses (
  owner_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  month DATE NOT NULL,
  uses INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (owner_id, month)
);

-- Short-lived proof, carried on the `go` URL, that a signed-in Pro viewer
-- is opening a platform from a particular shared list.
CREATE TABLE IF NOT EXISTS public.launch_tokens (
  token TEXT PRIMARY KEY,
  viewer_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  code TEXT NOT NULL REFERENCES public.shared_lists (code) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS launch_tokens_viewer ON public.launch_tokens (viewer_id);

ALTER TABLE public.member_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_link_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launch_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_links, public.shared_lists, public.share_link_uses, public.launch_tokens FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.share_cap()
RETURNS INTEGER LANGUAGE sql IMMUTABLE SET search_path = '' AS $$ SELECT 20 $$;
REVOKE ALL ON FUNCTION public.share_cap() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- A Pro member's own links.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_my_referral_link(p_name TEXT, p_url TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller UUID := auth.uid();
  key TEXT := lower(trim(coalesce(p_name, '')));
  url TEXT := trim(coalesce(p_url, ''));
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'NOT_SIGNED_IN: sign in first'; END IF;
  IF NOT public.is_pro_user(caller) THEN RAISE EXCEPTION 'PRO_ONLY: saving your own referral links needs Pro'; END IF;
  IF key = '' OR length(key) > 80 THEN RAISE EXCEPTION 'BAD_NAME: platform name missing or too long'; END IF;
  IF url = '' THEN
    DELETE FROM public.member_links WHERE user_id = caller AND name_key = key;
    RETURN;
  END IF;
  IF url !~* '^https?://\S+$' OR length(url) < 12 OR length(url) > 500 THEN RAISE EXCEPTION 'BAD_URL: the link must be an http(s) address'; END IF;
  INSERT INTO public.member_links (user_id, name_key, name, referral_url, updated_at)
  VALUES (caller, key, trim(p_name), url, now())
  ON CONFLICT (user_id, name_key) DO UPDATE SET name = EXCLUDED.name, referral_url = EXCLUDED.referral_url, updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.list_my_referral_links()
RETURNS TABLE (name TEXT, referral_url TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT l.name, l.referral_url FROM public.member_links AS l WHERE l.user_id = auth.uid() ORDER BY l.name;
$$;

-- ---------------------------------------------------------------------
-- The shared list. One per member, updated in place, so the code a
-- friend already has keeps pointing at the current list.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.share_my_list(p_title TEXT, p_platforms JSONB)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller UUID := auth.uid();
  existing TEXT;
  new_code TEXT;
  cleaned JSONB;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'NOT_SIGNED_IN: sign in first'; END IF;
  IF NOT public.is_pro_user(caller) THEN RAISE EXCEPTION 'PRO_ONLY: sharing your list needs Pro'; END IF;
  IF jsonb_typeof(p_platforms) <> 'array' OR jsonb_array_length(p_platforms) = 0 OR jsonb_array_length(p_platforms) > 300 THEN
    RAISE EXCEPTION 'BAD_LIST: a list holds 1 to 300 platforms';
  END IF;
  -- Names and tags only, trimmed and bounded. Nothing else in an entry survives.
  SELECT jsonb_agg(jsonb_build_object(
           'name', left(trim(e->>'name'), 80),
           'tags', COALESCE((SELECT jsonb_agg(left(trim(t), 40)) FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(e->'tags') = 'array' THEN e->'tags' ELSE '[]'::jsonb END) AS t WHERE trim(t) <> '' LIMIT 20), '[]'::jsonb)))
    INTO cleaned
  FROM jsonb_array_elements(p_platforms) AS e
  WHERE jsonb_typeof(e) = 'object' AND coalesce(trim(e->>'name'), '') <> '';
  IF cleaned IS NULL THEN RAISE EXCEPTION 'BAD_LIST: no platform names'; END IF;

  SELECT code INTO existing FROM public.shared_lists WHERE owner_id = caller;
  IF existing IS NOT NULL THEN
    UPDATE public.shared_lists SET title = left(trim(coalesce(p_title, 'My list')), 60), platforms = cleaned, updated_at = now() WHERE owner_id = caller;
    RETURN existing;
  END IF;
  -- Eight characters from an alphabet without look-alikes.
  LOOP
    new_code := (SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::INT, 1), '') FROM generate_series(1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.shared_lists WHERE code = new_code);
  END LOOP;
  INSERT INTO public.shared_lists (code, owner_id, title, platforms) VALUES (new_code, caller, left(trim(coalesce(p_title, 'My list')), 60), cleaned);
  RETURN new_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.unshare_my_list()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  DELETE FROM public.shared_lists WHERE owner_id = auth.uid();
$$;

-- Anyone signed in can read a list by its code. links_active says
-- whether the sharer's referral links would apply to this caller now.
CREATE OR REPLACE FUNCTION public.get_shared_list(p_code TEXT)
RETURNS TABLE (code TEXT, title TEXT, sharer TEXT, platforms JSONB, links_active BOOLEAN, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller UUID := auth.uid();
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'NOT_SIGNED_IN: sign in first'; END IF;
  RETURN QUERY
  SELECT l.code, l.title, coalesce(p.public_alias, 'a Pro member'), l.platforms,
         (l.owner_id <> caller AND public.is_pro_user(l.owner_id) AND public.is_pro_user(caller)),
         l.updated_at
  FROM public.shared_lists AS l
  LEFT JOIN public.community_profiles AS p ON p.id = l.owner_id
  WHERE l.code = upper(trim(p_code));
END;
$$;

-- The sharer's own view: code, what the list holds, and the month's uses.
CREATE OR REPLACE FUNCTION public.my_share_status()
RETURNS TABLE (code TEXT, title TEXT, platform_count INTEGER, uses_this_month INTEGER, cap INTEGER, pro BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT l.code, l.title, jsonb_array_length(l.platforms),
         COALESCE((SELECT u.uses FROM public.share_link_uses AS u WHERE u.owner_id = auth.uid() AND u.month = date_trunc('month', now())::DATE), 0),
         public.share_cap(),
         public.is_pro_user(auth.uid())
  FROM public.shared_lists AS l
  WHERE l.owner_id = auth.uid()
  UNION ALL
  SELECT NULL, NULL, 0,
         COALESCE((SELECT u.uses FROM public.share_link_uses AS u WHERE u.owner_id = auth.uid() AND u.month = date_trunc('month', now())::DATE), 0),
         public.share_cap(),
         public.is_pro_user(auth.uid())
  WHERE NOT EXISTS (SELECT 1 FROM public.shared_lists AS l WHERE l.owner_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- Launch tokens: a Pro viewer asks for one per shared list they follow;
-- the app puts it on the `go` URL. Nothing is minted for a viewer who
-- is not Pro, for a list whose sharer is not Pro, or for the sharer's
-- own list, so OPEN simply falls through to the house's link.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mint_launch_tokens(p_codes TEXT[])
RETURNS TABLE (code TEXT, token TEXT, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller UUID := auth.uid();
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'NOT_SIGNED_IN: sign in first'; END IF;
  DELETE FROM public.launch_tokens AS t WHERE t.viewer_id = caller AND (t.expires_at < now() OR t.code = ANY (SELECT upper(trim(c)) FROM unnest(p_codes) AS c));
  IF NOT public.is_pro_user(caller) THEN RETURN; END IF;
  RETURN QUERY
  INSERT INTO public.launch_tokens (token, viewer_id, code, expires_at)
  SELECT encode(extensions.gen_random_bytes(24), 'hex'), caller, l.code, now() + INTERVAL '24 hours'
  FROM public.shared_lists AS l
  WHERE l.code = ANY (SELECT upper(trim(c)) FROM unnest(p_codes) AS c)
    AND l.owner_id <> caller
    AND public.is_pro_user(l.owner_id)
  RETURNING launch_tokens.code, launch_tokens.token, launch_tokens.expires_at;
END;
$$;

-- For the `go` redirect only (service role): the sharer's link for this
-- platform if every rule holds right now, else NULL. Counts the use when
-- the house has a link of its own for the platform.
CREATE OR REPLACE FUNCTION public.resolve_shared_link(p_token TEXT, p_name_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  t RECORD;
  sharer UUID;
  link TEXT;
  house_has_link BOOLEAN;
  used INTEGER;
BEGIN
  SELECT viewer_id, code INTO t FROM public.launch_tokens WHERE token = p_token AND expires_at > now();
  IF t.viewer_id IS NULL THEN RETURN NULL; END IF;
  SELECT owner_id INTO sharer FROM public.shared_lists WHERE code = t.code;
  IF sharer IS NULL OR sharer = t.viewer_id THEN RETURN NULL; END IF;
  IF NOT public.is_pro_user(sharer) OR NOT public.is_pro_user(t.viewer_id) THEN RETURN NULL; END IF;
  SELECT referral_url INTO link FROM public.member_links WHERE user_id = sharer AND name_key = lower(trim(p_name_key));
  IF link IS NULL THEN RETURN NULL; END IF;
  SELECT has_referral INTO house_has_link FROM public.platform_links WHERE name_key = lower(trim(p_name_key));
  IF COALESCE(house_has_link, FALSE) THEN
    INSERT INTO public.share_link_uses (owner_id, month, uses) VALUES (sharer, date_trunc('month', now())::DATE, 1)
    ON CONFLICT (owner_id, month) DO UPDATE SET uses = share_link_uses.uses + 1
    RETURNING uses INTO used;
    IF used > public.share_cap() THEN RETURN NULL; END IF;
  END IF;
  RETURN link;
END;
$$;

REVOKE ALL ON FUNCTION public.set_my_referral_link(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_my_referral_links() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.share_my_list(TEXT, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unshare_my_list() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_shared_list(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_share_status() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mint_launch_tokens(TEXT[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resolve_shared_link(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_my_referral_link(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_referral_links() TO authenticated;
GRANT EXECUTE ON FUNCTION public.share_my_list(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unshare_my_list() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_list(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_share_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mint_launch_tokens(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_shared_link(TEXT, TEXT) TO service_role;
