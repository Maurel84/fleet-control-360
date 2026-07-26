/*
# 001 — Organisations, branches, agencies, users, roles, subscriptions, settings

## Purpose
Lays the multi-tenant foundation for FleetControl 360. Every business ("organization")
is strictly isolated: all business tables created in later migrations carry an
`organization_id` foreign key and RLS policies that scope rows to the organizations
the current user belongs to.

## New tables
1. `organizations` — top-level tenant (a company using FleetControl 360).
2. `branches` — a filiale/subsidiary inside an organization (optional layer).
3. `agencies` — physical operating sites (parkings, dépôts, counters).
4. `subscription_plans` — SaaS plan catalog (Starter / Professionnel / Entreprise).
5. `subscriptions` — a given org's active plan + usage limits.
6. `user_profiles` — profile/role info linked to auth.users.
7. `roles` — role definitions per organization (or platform-wide if org null).
8. `user_roles` — join users to roles.
9. `user_agency_access` — restrict/extend which agencies a user may see.
10. `application_settings` — per-org configuration (logo, colors, numbering, thresholds).

## Security
- RLS enabled on every table.
- Platform-admin bypass via `is_platform_admin()`; tenant isolation via `user_in_org()`.
- A user reads/updates their own profile; org-scoped admins read all profiles in their org.
- Helper functions resolve org membership from `user_profiles`.

## Notes
- `auth.users` is managed by Supabase Auth; we never create custom auth tables.
- A trigger auto-creates a `user_profiles` row whenever a new auth.user is created.
*/

create extension if not exists "pgcrypto";

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  tax_id text,
  address text,
  phone text,
  email text,
  currency_code text not null default 'XOF',
  timezone text not null default 'Africa/Abidjan',
  locale text not null default 'fr',
  logo_url text,
  primary_color text default '#1e40af',
  is_active boolean not null default true,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- BRANCHES
-- ============================================================
create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text,
  address text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_branches_organization on public.branches(organization_id);

-- ============================================================
-- AGENCIES
-- ============================================================
create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  code text,
  city text,
  country text default 'Côte d''Ivoire',
  address text,
  phone text,
  manager_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_agencies_organization on public.agencies(organization_id);
create index if not exists idx_agencies_branch on public.agencies(branch_id);

-- ============================================================
-- SUBSCRIPTION PLANS (catalog — platform-wide, read-only for tenants)
-- ============================================================
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text,
  max_vehicles int not null default 10,
  max_users int not null default 5,
  max_agencies int not null default 1,
  price_monthly numeric(12,2) not null default 0,
  price_yearly numeric(12,2) not null default 0,
  currency_code text not null default 'XOF',
  features jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- SUBSCRIPTIONS (org -> plan)
-- ============================================================
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  status text not null default 'active' check (status in ('active','suspended','expired','canceled','trialing')),
  started_at timestamptz not null default now(),
  ends_at timestamptz,
  is_trial boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_subscriptions_organization on public.subscriptions(organization_id);

-- ============================================================
-- USER PROFILES
-- ============================================================
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  email text not null,
  full_name text,
  phone text,
  avatar_url text,
  is_platform_admin boolean not null default false,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_user_profiles_organization on public.user_profiles(organization_id);

-- ============================================================
-- HELPER FUNCTIONS (defined AFTER user_profiles exists)
-- ============================================================
create or replace function public.current_user_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.user_profiles where id = auth.uid();
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_platform_admin from public.user_profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.user_in_org(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid() and organization_id = p_org_id
  ) or public.is_platform_admin();
$$;

-- Trigger: create a user_profiles row when auth.users row is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at trigger helper
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ============================================================
-- ROLES
-- ============================================================
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  is_system boolean not null default false,
  permissions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

-- ============================================================
-- USER ROLES
-- ============================================================
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assigned_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, role_id)
);
create index if not exists idx_user_roles_user on public.user_roles(user_id);
create index if not exists idx_user_roles_role on public.user_roles(role_id);

-- ============================================================
-- USER AGENCY ACCESS
-- ============================================================
create table if not exists public.user_agency_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  can_view boolean not null default true,
  can_manage boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, agency_id)
);
create index if not exists idx_user_agency_access_user on public.user_agency_access(user_id);

-- ============================================================
-- APPLICATION SETTINGS (per org)
-- ============================================================
create table if not exists public.application_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- ENABLE RLS + POLICIES
-- ============================================================
alter table public.organizations enable row level security;
drop policy if exists "org_select_own_or_platform" on public.organizations;
create policy "org_select_own_or_platform" on public.organizations
  for select to authenticated using (public.user_in_org(id));
drop policy if exists "org_insert_platform" on public.organizations;
create policy "org_insert_platform" on public.organizations
  for insert to authenticated with check (public.is_platform_admin());
drop policy if exists "org_update_platform_or_own" on public.organizations;
create policy "org_update_platform_or_own" on public.organizations
  for update to authenticated
  using (public.is_platform_admin() or public.user_in_org(id))
  with check (public.is_platform_admin() or public.user_in_org(id));

alter table public.branches enable row level security;
drop policy if exists "branches_select_own" on public.branches;
create policy "branches_select_own" on public.branches for select to authenticated using (public.user_in_org(organization_id));
drop policy if exists "branches_insert_own" on public.branches;
create policy "branches_insert_own" on public.branches for insert to authenticated with check (public.user_in_org(organization_id));
drop policy if exists "branches_update_own" on public.branches;
create policy "branches_update_own" on public.branches for update to authenticated using (public.user_in_org(organization_id)) with check (public.user_in_org(organization_id));
drop policy if exists "branches_delete_own" on public.branches;
create policy "branches_delete_own" on public.branches for delete to authenticated using (public.user_in_org(organization_id));

alter table public.agencies enable row level security;
drop policy if exists "agencies_select_own" on public.agencies;
create policy "agencies_select_own" on public.agencies for select to authenticated using (public.user_in_org(organization_id));
drop policy if exists "agencies_insert_own" on public.agencies;
create policy "agencies_insert_own" on public.agencies for insert to authenticated with check (public.user_in_org(organization_id));
drop policy if exists "agencies_update_own" on public.agencies;
create policy "agencies_update_own" on public.agencies for update to authenticated using (public.user_in_org(organization_id)) with check (public.user_in_org(organization_id));
drop policy if exists "agencies_delete_own" on public.agencies;
create policy "agencies_delete_own" on public.agencies for delete to authenticated using (public.user_in_org(organization_id));

alter table public.subscription_plans enable row level security;
drop policy if exists "plans_select_all" on public.subscription_plans;
create policy "plans_select_all" on public.subscription_plans for select to authenticated using (true);
drop policy if exists "plans_modify_platform" on public.subscription_plans;
create policy "plans_modify_platform" on public.subscription_plans
  for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

alter table public.subscriptions enable row level security;
drop policy if exists "subs_select_own" on public.subscriptions;
create policy "subs_select_own" on public.subscriptions for select to authenticated using (public.user_in_org(organization_id));
drop policy if exists "subs_modify_own_or_platform" on public.subscriptions;
create policy "subs_modify_own_or_platform" on public.subscriptions
  for all to authenticated using (public.user_in_org(organization_id)) with check (public.user_in_org(organization_id));

alter table public.user_profiles enable row level security;
drop policy if exists "profiles_select_self_or_org" on public.user_profiles;
create policy "profiles_select_self_or_org" on public.user_profiles
  for select to authenticated using (id = auth.uid() or public.user_in_org(organization_id));
drop policy if exists "profiles_insert_self_on_signup" on public.user_profiles;
create policy "profiles_insert_self_on_signup" on public.user_profiles
  for insert to authenticated with check (id = auth.uid());
drop policy if exists "profiles_update_self_or_org" on public.user_profiles;
create policy "profiles_update_self_or_org" on public.user_profiles
  for update to authenticated using (id = auth.uid() or public.user_in_org(organization_id))
  with check (id = auth.uid() or public.user_in_org(organization_id));
drop policy if exists "profiles_delete_self" on public.user_profiles;
create policy "profiles_delete_self" on public.user_profiles for delete to authenticated using (id = auth.uid());

alter table public.roles enable row level security;
drop policy if exists "roles_select_own" on public.roles;
create policy "roles_select_own" on public.roles
  for select to authenticated using (organization_id is null or public.user_in_org(organization_id));
drop policy if exists "roles_insert_own" on public.roles;
create policy "roles_insert_own" on public.roles for insert to authenticated with check (public.user_in_org(organization_id));
drop policy if exists "roles_update_own" on public.roles;
create policy "roles_update_own" on public.roles for update to authenticated using (public.user_in_org(organization_id)) with check (public.user_in_org(organization_id));
drop policy if exists "roles_delete_own" on public.roles;
create policy "roles_delete_own" on public.roles for delete to authenticated using (public.user_in_org(organization_id));

alter table public.user_roles enable row level security;
drop policy if exists "user_roles_select_own" on public.user_roles;
create policy "user_roles_select_own" on public.user_roles
  for select to authenticated using (public.user_in_org(organization_id) or user_id = auth.uid());
drop policy if exists "user_roles_insert_own" on public.user_roles;
create policy "user_roles_insert_own" on public.user_roles for insert to authenticated with check (public.user_in_org(organization_id));
drop policy if exists "user_roles_update_own" on public.user_roles;
create policy "user_roles_update_own" on public.user_roles for update to authenticated using (public.user_in_org(organization_id)) with check (public.user_in_org(organization_id));
drop policy if exists "user_roles_delete_own" on public.user_roles;
create policy "user_roles_delete_own" on public.user_roles for delete to authenticated using (public.user_in_org(organization_id));

alter table public.user_agency_access enable row level security;
drop policy if exists "uaa_select_own" on public.user_agency_access;
create policy "uaa_select_own" on public.user_agency_access for select to authenticated
  using (user_id = auth.uid() or public.user_in_org((select a.organization_id from public.agencies a where a.id = user_agency_access.agency_id)));
drop policy if exists "uaa_insert_own" on public.user_agency_access;
create policy "uaa_insert_own" on public.user_agency_access for insert to authenticated
  with check (public.user_in_org((select a.organization_id from public.agencies a where a.id = user_agency_access.agency_id)));
drop policy if exists "uaa_update_own" on public.user_agency_access;
create policy "uaa_update_own" on public.user_agency_access for update to authenticated
  using (public.user_in_org((select a.organization_id from public.agencies a where a.id = user_agency_access.agency_id)))
  with check (public.user_in_org((select a.organization_id from public.agencies a where a.id = user_agency_access.agency_id)));
drop policy if exists "uaa_delete_own" on public.user_agency_access;
create policy "uaa_delete_own" on public.user_agency_access for delete to authenticated
  using (public.user_in_org((select a.organization_id from public.agencies a where a.id = user_agency_access.agency_id)));

alter table public.application_settings enable row level security;
drop policy if exists "settings_select_own" on public.application_settings;
create policy "settings_select_own" on public.application_settings for select to authenticated using (public.user_in_org(organization_id));
drop policy if exists "settings_modify_own" on public.application_settings;
create policy "settings_modify_own" on public.application_settings
  for all to authenticated using (public.user_in_org(organization_id)) with check (public.user_in_org(organization_id));

-- ============================================================
-- updated_at triggers for all tables above
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'organizations','branches','agencies','subscription_plans',
    'subscriptions','user_profiles','roles','user_roles',
    'user_agency_access','application_settings'
  ]
  loop
    execute format(
      'drop trigger if exists trg_%1$s_touch on public.%1$s;
       create trigger trg_%1$s_touch before update on public.%1$s
       for each row execute function public.touch_updated_at();',
      t
    );
  end loop;
end$$;
