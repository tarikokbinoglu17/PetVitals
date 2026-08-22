alter table public.care_tasks enable row level security;
alter table public.smart_reminders enable row level security;

create policy "Owners manage care tasks" on public.care_tasks for all to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Active members view care tasks" on public.care_tasks for select to authenticated
using (exists (select 1 from public.pet_members pm where pm.pet_id=care_tasks.pet_id and pm.member_user_id=(select auth.uid()) and pm.revoked_at is null and (pm.expires_at is null or pm.expires_at>now())));
create policy "Editable members update care tasks" on public.care_tasks for update to authenticated
using (exists (select 1 from public.pet_members pm where pm.pet_id=care_tasks.pet_id and pm.member_user_id=(select auth.uid()) and pm.can_edit=true and pm.revoked_at is null and (pm.expires_at is null or pm.expires_at>now())))
with check (exists (select 1 from public.pet_members pm where pm.pet_id=care_tasks.pet_id and pm.member_user_id=(select auth.uid()) and pm.can_edit=true and pm.revoked_at is null and (pm.expires_at is null or pm.expires_at>now())));

create policy "Owners manage smart reminders" on public.smart_reminders for all to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Active members view smart reminders" on public.smart_reminders for select to authenticated
using (exists (select 1 from public.pet_members pm where pm.pet_id=smart_reminders.pet_id and pm.member_user_id=(select auth.uid()) and pm.revoked_at is null and (pm.expires_at is null or pm.expires_at>now())));
create policy "Editable members update smart reminders" on public.smart_reminders for update to authenticated
using (exists (select 1 from public.pet_members pm where pm.pet_id=smart_reminders.pet_id and pm.member_user_id=(select auth.uid()) and pm.can_edit=true and pm.revoked_at is null and (pm.expires_at is null or pm.expires_at>now())))
with check (exists (select 1 from public.pet_members pm where pm.pet_id=smart_reminders.pet_id and pm.member_user_id=(select auth.uid()) and pm.can_edit=true and pm.revoked_at is null and (pm.expires_at is null or pm.expires_at>now())));

create policy "Invitees view email invitations" on public.pet_members for select to authenticated
using (member_user_id is null and lower(invite_email)=lower(coalesce((select auth.jwt()->>'email'),'')) and revoked_at is null and (expires_at is null or expires_at>now()));
create policy "Invitees accept own email invitation" on public.pet_members for update to authenticated
using (member_user_id is null and lower(invite_email)=lower(coalesce((select auth.jwt()->>'email'),'')) and revoked_at is null and (expires_at is null or expires_at>now()))
with check (member_user_id=(select auth.uid()) and lower(invite_email)=lower(coalesce((select auth.jwt()->>'email'),'')) and revoked_at is null);

create or replace function public.accept_pet_invite(p_member_id uuid)
returns void language plpgsql security invoker set search_path=public as $$
declare current_email text;
begin
  current_email := coalesce(auth.jwt()->>'email','');
  update public.pet_members set member_user_id=auth.uid()
  where id=p_member_id and member_user_id is null and lower(invite_email)=lower(current_email)
    and revoked_at is null and (expires_at is null or expires_at>now());
  if not found then raise exception 'Invite not found or not authorized'; end if;
end; $$;
revoke all on function public.accept_pet_invite(uuid) from public;
grant execute on function public.accept_pet_invite(uuid) to authenticated;
