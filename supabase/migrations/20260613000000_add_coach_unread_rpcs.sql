-- Coach-side unread messaging support.
--
-- The family unread schema (get_profile_unread_*, broadcast_message_insert,
-- the realtime RLS policies, and conversations.coach_last_read_at) already
-- exists remote-only. The broadcast trigger already emits an UNREAD event to
-- `coach:<coachAccountId>:unread` and an RLS policy already authorizes coaches
-- to read it — there was just no consumer. This migration adds the coach-side
-- read RPCs and teaches mark_conversation_read to clear the coach's read marker
-- so the coach /message page can mirror the families unread experience.
--
-- All additive / CREATE OR REPLACE, so it is safe to apply on top of the
-- existing remote state.

-- Total unread for the calling coach: messages in their conversations that the
-- family sent, newer than the coach's read marker.
CREATE OR REPLACE FUNCTION public.get_coach_unread_total()
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT count(*)::int
  FROM public.messages m
  JOIN public.conversations c ON c.id = m.conversation_id
  JOIN public.coaches co ON co.id = c.coach_id
  WHERE co.account_id = (SELECT auth.uid())
    AND m.sender_id <> (SELECT auth.uid())
    AND m.created_at > COALESCE(c.coach_last_read_at, '-infinity'::timestamptz);
$function$;

-- Per-contact unread for the calling coach, keyed by the family profile id
-- (which is the coach UI's Contact.id).
CREATE OR REPLACE FUNCTION public.get_coach_unread_by_contact()
 RETURNS TABLE(contact_id uuid, unread_count integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT c.profile_id AS contact_id, count(*)::int AS unread_count
  FROM public.messages m
  JOIN public.conversations c ON c.id = m.conversation_id
  JOIN public.coaches co ON co.id = c.coach_id
  WHERE co.account_id = (SELECT auth.uid())
    AND m.sender_id <> (SELECT auth.uid())
    AND m.created_at > COALESCE(c.coach_last_read_at, '-infinity'::timestamptz)
  GROUP BY c.profile_id;
$function$;

-- Clear the read marker for whichever side the caller is on. Only the UPDATE
-- whose ownership check matches the caller (auth.uid()) takes effect, so a
-- family member cannot clear the coach marker and vice versa.
CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Family caller: clear the profile read marker when they own the profile.
  UPDATE public.conversations c
  SET profile_last_read_at = now()
  WHERE c.id = p_conversation_id
    AND (
      (c.profile_type = 'student' AND EXISTS (SELECT 1 FROM public.students s
         WHERE s.id = c.profile_id AND s.account_id = (SELECT auth.uid())))
   OR (c.profile_type = 'parent'  AND EXISTS (SELECT 1 FROM public.parents pr
         WHERE pr.id = c.profile_id AND pr.account_id = (SELECT auth.uid())))
    );

  -- Coach caller: clear the coach read marker when they own the conversation.
  UPDATE public.conversations c
  SET coach_last_read_at = now()
  WHERE c.id = p_conversation_id
    AND EXISTS (SELECT 1 FROM public.coaches co
         WHERE co.id = c.coach_id AND co.account_id = (SELECT auth.uid()));
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_coach_unread_total() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_coach_unread_by_contact() TO authenticated;
