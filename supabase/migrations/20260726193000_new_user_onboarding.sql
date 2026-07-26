-- Recreate handle_new_user trigger function to automatically bind new users to the demo organization and grant them org_admin role
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid := '11111111-1111-1111-1111-111111111111';
  v_role_id uuid;
begin
  -- 1. Insert user profile and automatically bind to the demo organization
  insert into public.user_profiles (id, email, full_name, organization_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    v_org_id
  )
  on conflict (id) do update set
    organization_id = coalesce(user_profiles.organization_id, excluded.organization_id);

  -- 2. Fetch the 'org_admin' role ID for this organization
  select id into v_role_id 
  from public.roles 
  where organization_id = v_org_id and code = 'org_admin';

  -- 3. If found, auto-assign this role to the user so they have full permissions instantly
  if v_role_id is not null then
    insert into public.user_roles (user_id, role_id, organization_id)
    values (new.id, v_role_id, v_org_id)
    on conflict (user_id, role_id) do nothing;
  end if;

  return new;
end;
$$;

-- Update existing user profiles that have no organization to belong to the demo organization
update public.user_profiles
set organization_id = '11111111-1111-1111-1111-111111111111'
where organization_id is null;

-- Grant org_admin role to all user profiles associated with the demo organization that don't have a role assigned yet
insert into public.user_roles (user_id, role_id, organization_id)
select up.id, r.id, up.organization_id
from public.user_profiles up
join public.roles r on r.organization_id = up.organization_id and r.code = 'org_admin'
where up.organization_id = '11111111-1111-1111-1111-111111111111'
on conflict (user_id, role_id) do nothing;
