-- catalog_publish_as() takes a transaction-scoped advisory lock first, so two
-- publishes cannot interleave (review on PR #87). Same body otherwise; the
-- repo's 20260928152228_catalog_publish_key.sql carries the final definition,
-- so on a fresh database this finds the lock already there and does nothing.
DO $m$
DECLARE
  def TEXT;
  patched TEXT;
BEGIN
  def := pg_get_functiondef('public.catalog_publish_as(jsonb, uuid)'::regprocedure);
  IF position('pg_advisory_xact_lock' IN def) > 0 THEN
    RETURN;
  END IF;
  patched := replace(def,
    E'  dropped TEXT[];\nBEGIN\n',
    E'  dropped TEXT[];\nBEGIN\n  -- One publish at a time. Two at once could both read the same latest\n  -- release and leave the payload and platform_links from different files.\n  PERFORM pg_advisory_xact_lock(hashtext(''public.catalog_publish''));\n');
  IF patched = def THEN
    RAISE EXCEPTION 'catalog_publish_as body did not match; lock not added';
  END IF;
  EXECUTE patched;
END
$m$;
