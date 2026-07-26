-- Create public RPC function to retrieve company visual identity by email
create or replace function public.get_organization_by_email(email_input text)
returns table (
  name text,
  logo_url text,
  primary_color text
) as $$
begin
  return query
  select o.name, o.logo_url, o.primary_color
  from public.organizations o
  join public.user_profiles p on p.organization_id = o.id
  where p.email = email_input;
end;
$$ language plpgsql security definer;
