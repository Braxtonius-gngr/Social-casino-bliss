-- bug_reports.user_id joins the account tables that delete_my_account()
-- relies on: every user table references auth.users ON DELETE CASCADE, so
-- deleting the auth.users row removes everything stored with the account
-- (see 20260926153305_delete_my_account.sql). The column shipped without
-- that constraint, so a tester who chose "Delete My Cloud Data" would have
-- kept their reports, diagnostics and account id here. A report sent with
-- no session (user_id null) is unaffected.
ALTER TABLE public.bug_reports
  ADD CONSTRAINT bug_reports_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- So the cascade finds an account's rows without scanning the table.
CREATE INDEX IF NOT EXISTS bug_reports_user_idx
  ON public.bug_reports (user_id)
  WHERE user_id IS NOT NULL;
