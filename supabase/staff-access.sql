-- Выполнять только после проверки резервной копии и существующих политик.
begin;

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'restaurant_tables', 'activity_logs', 'staff_approvals')
  ) then
    raise exception 'Обнаружены существующие политики. Проверьте их перед настройкой доступа.';
  end if;
  if exists (
    select 1 from pg_trigger
    where tgrelid = 'public.restaurant_tables'::regclass and not tgisinternal
  ) then
    raise exception 'Обнаружены триггеры столиков. Проверьте их перед настройкой журнала.';
  end if;
end
$$;

create table public.staff_approvals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  approved_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.activity_logs enable row level security;
alter table public.staff_approvals enable row level security;

revoke all on public.profiles, public.restaurant_tables, public.activity_logs, public.staff_approvals
  from public, anon, authenticated;
revoke all (id, email, full_name, role, last_active) on public.profiles from public, anon, authenticated;
revoke all (id, table_number, seats, status, updated_at, updated_by) on public.restaurant_tables from public, anon, authenticated;
revoke all (id, table_id, action, user_email, created_at) on public.activity_logs from public, anon, authenticated;
revoke all on sequence public.restaurant_tables_id_seq, public.activity_logs_id_seq
  from public, anon, authenticated;

grant select on public.staff_approvals to authenticated;
grant select on public.profiles to authenticated;
grant insert (id, email, last_active), update (id, email, last_active)
  on public.profiles to authenticated;
grant select on public.restaurant_tables to authenticated;
grant insert (table_number, seats, status, updated_at, updated_by),
  update (status, updated_at, updated_by) on public.restaurant_tables to authenticated;
grant select on public.activity_logs to authenticated;
grant usage on sequence public.restaurant_tables_id_seq to authenticated;

create policy "Чтение собственного подтверждения" on public.staff_approvals
  for select to authenticated using (user_id = (select auth.uid()));

create policy "Чтение собственного профиля" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "Создание собственного профиля" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()) and email = (select auth.jwt() ->> 'email'));
create policy "Обновление собственного профиля" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and email = (select auth.jwt() ->> 'email'));

create policy "Сотрудники видят столики" on public.restaurant_tables
  for select to authenticated
  using (exists (select 1 from public.staff_approvals where user_id = (select auth.uid())));
create policy "Сотрудники добавляют столики" on public.restaurant_tables
  for insert to authenticated
  with check (
    exists (select 1 from public.staff_approvals where user_id = (select auth.uid()))
    and updated_by = (select auth.uid()) and seats > 0
    and status in ('free', 'occupied', 'reserved')
  );
create policy "Сотрудники меняют столики" on public.restaurant_tables
  for update to authenticated
  using (exists (select 1 from public.staff_approvals where user_id = (select auth.uid())))
  with check (
    exists (select 1 from public.staff_approvals where user_id = (select auth.uid()))
    and updated_by = (select auth.uid()) and seats > 0
    and status in ('free', 'occupied', 'reserved')
  );
create policy "Сотрудники видят журнал" on public.activity_logs
  for select to authenticated
  using (exists (select 1 from public.staff_approvals where user_id = (select auth.uid())));

create function public.log_table_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status then
    insert into public.activity_logs (table_id, action, user_email)
    values (
      new.id,
      new.table_number || ' → ' || case new.status
        when 'free' then 'Свободен'
        when 'occupied' then 'Занят'
        when 'reserved' then 'Бронь'
        else coalesce(new.status, 'Неизвестный статус')
      end,
      coalesce(auth.jwt() ->> 'email', 'Система')
    );
  end if;
  return new;
end
$$;
revoke all on function public.log_table_status_change() from public, anon, authenticated;
create trigger log_table_status_change
  after update of status on public.restaurant_tables
  for each row execute function public.log_table_status_change();

commit;
