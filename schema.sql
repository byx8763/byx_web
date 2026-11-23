-- Apply only to the intended project. Existing users must be managed in Supabase Auth.
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  name text not null check (length(trim(name)) between 1 and 100),
  employee_number text not null check (length(trim(employee_number)) between 1 and 100),
  age_at_entry integer not null check (age_at_entry between 0 and 120),
  age_entry_year integer not null check (age_entry_year between 1900 and 9999),
  labor_exam_date date,
  food_exam_date date,
  created_at timestamptz not null default now(),
  unique (owner_id, employee_number)
);
alter table public.employees enable row level security;
revoke all on public.employees from anon, authenticated;
grant select, insert, update, delete on public.employees to authenticated;
create policy "owners manage employees" on public.employees for all to authenticated
  using ((select auth.uid()) = owner_id and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) = false)
  with check ((select auth.uid()) = owner_id and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) = false);
