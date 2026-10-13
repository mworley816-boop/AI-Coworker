-- Do not permit proposal owners to spoof review state during insert.
-- Review transitions must go through the authorized atomic RPC.
drop policy if exists "owners submit pending proposals" on public.scentmarked_proposals;
create policy "owners submit pending proposals" on public.scentmarked_proposals
 for insert to authenticated
 with check (
  auth.uid()=user_id
  and review_status='PENDING_ADMIN_REVIEW'
  and duplicate_check_status in ('EXACT_NAME_CHECKED_PUBLIC_ONLY','EXACT_NAME_CHECKED_DRAFT_INCLUSIVE')
 );
-- Restrict direct column updates. Reviewer RPC is SECURITY DEFINER and retains access.
revoke update,delete on public.scentmarked_proposals from authenticated;
revoke insert,update,delete on public.scentmarked_proposal_reviews from authenticated;
