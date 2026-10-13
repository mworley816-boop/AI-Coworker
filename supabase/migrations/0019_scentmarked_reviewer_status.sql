create or replace function public.is_scentmarked_reviewer()
returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists(select 1 from public.scentmarked_reviewers where user_id=auth.uid());
$$;
revoke all on function public.is_scentmarked_reviewer() from public;
grant execute on function public.is_scentmarked_reviewer() to authenticated;
