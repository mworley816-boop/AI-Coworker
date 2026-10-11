-- A reviewer can list pending proposals without being granted table-wide SELECT.
create or replace function public.list_pending_scentmarked_proposals(p_limit integer default 30)
returns table(id uuid,brand text,perfume_name text,created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.scentmarked_reviewers r where r.user_id=auth.uid()) then
  raise exception 'Reviewer authorization required' using errcode='42501';
 end if;
 return query select p.id,p.brand,p.perfume_name,p.created_at
 from public.scentmarked_proposals p
 where p.review_status='PENDING_ADMIN_REVIEW'
 order by p.created_at asc,p.id asc
 limit least(greatest(coalesce(p_limit,30),1),50);
end $$;
revoke all on function public.list_pending_scentmarked_proposals(integer) from public;
grant execute on function public.list_pending_scentmarked_proposals(integer) to authenticated;
