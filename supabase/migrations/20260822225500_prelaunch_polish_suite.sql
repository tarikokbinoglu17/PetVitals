create table if not exists public.care_tasks (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade, title text not null,
  task_type text not null default 'custom', due_at timestamptz, recurrence text, notes text,
  assigned_user_id uuid references auth.users(id) on delete set null, status text not null default 'open',
  completed_at timestamptz, completed_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
create table if not exists public.smart_reminders (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade, title text not null, reminder_type text not null,
  remind_at timestamptz not null, repeat_rule text, snooze_minutes integer not null default 60,
  status text not null default 'active', last_notified_at timestamptz, completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null, local_notification_id text, created_at timestamptz not null default now()
);
alter table public.care_tasks enable row level security;
alter table public.smart_reminders enable row level security;
alter table public.profiles add column if not exists contact_phone text;
alter table public.profiles add column if not exists contact_email text;
create index if not exists care_tasks_pet_due_idx on public.care_tasks(pet_id,due_at);
create index if not exists care_tasks_owner_status_idx on public.care_tasks(owner_id,status);
create index if not exists smart_reminders_owner_time_idx on public.smart_reminders(owner_id,remind_at) where status='active';
create index if not exists smart_reminders_pet_idx on public.smart_reminders(pet_id);
