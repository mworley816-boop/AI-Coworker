-- Add read-only connected Google tools for existing coworkers.
insert into public.coworker_tool_permissions (coworker_id,tool_id,enabled,access,approval_mode)
select c.id,t.tool_id,false,'read','never'
from public.coworkers c
cross join (values ('email.read'),('calendar.read'),('files.search')) as t(tool_id)
on conflict (coworker_id,tool_id) do nothing;
