ALTER POLICY collection_events_select_own ON public.collection_events
  USING ((select auth.uid()) = user_id);

ALTER POLICY collection_events_insert_own ON public.collection_events
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY collection_events_update_own ON public.collection_events
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
