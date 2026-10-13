-- Reviewers are provisioned by database administrators only.
create table if not exists public.scentmarked_reviewers (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.scentmarked_reviewers enable row level security;
-- No direct table access for authenticated clients.
create or replace function public.review_scentmarked_proposal(p_proposal_id uuid,p_decision text,p_rationale text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.scentmarked_reviewers where user_id=auth.uid()) then
  raise exception 'Not authorized to review proposals' using errcode='42501';
 end if;
 if p_decision not in ('NEEDS_CHANGES','REJECTED') or length(trim(coalesce(p_rationale,''))) not between 10 and 2000 then
  raise exception 'Invalid review decision or rationale' using errcode='22023';
 end if;
 perform 1 from public.scentmarked_proposals where id=p_proposal_id and review_status='PENDING_ADMIN_REVIEW' for update;
 if not found then raise exception 'Proposal is not pending review' using errcode='22023'; end if;
 insert into public.scentmarked_proposal_reviews(proposal_id,reviewer_id,decision,rationale)
 values(p_proposal_id,auth.uid(),p_decision,trim(p_rationale)) returning id into v_id;
 update public.scentmarked_proposals set review_status=p_decision where id=p_proposal_id;
 return v_id;
end $$;
revoke all on function public.review_scentmarked_proposal(uuid,text,text) from public;
grant execute on function public.review_scentmarked_proposal(uuid,text,text) to authenticated;
