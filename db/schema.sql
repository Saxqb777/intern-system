-- Al Foah intern attendance. Run this once against the Neon database.
-- Safe to re-run: everything is "if not exists".

create table if not exists users (
  id            serial primary key,
  email         text not null unique,
  name          text not null,
  password_hash text not null,
  -- pending | intern | admin | superuser
  role          text not null default 'pending',
  position      text,
  department    text,
  mentor        text,
  university    text,
  created_at    timestamptz not null default now(),
  approved_at   timestamptz,
  approved_by   integer references users(id) on delete set null,
);

create index if not exists users_role_idx on users(role);

-- One row per intern per working day.
create table if not exists attendance (
  id           serial primary key,
  user_id      integer not null references users(id) on delete cascade,
  work_date    date not null,
  time_in      timestamptz,
  time_out     timestamptz,

  -- everything we know about where the punch came from, kept for audit
  in_lat       double precision,
  in_lng       double precision,
  in_accuracy  double precision,
  in_distance  double precision,
  in_ip        text,
  out_lat      double precision,
  out_lng      double precision,
  out_accuracy double precision,
  out_distance double precision,
  out_ip       text,

  -- The supervisor's signature, drawn in their own account after the intern
  -- has signed out. Interns do not sign their own attendance: a record the
  -- measured person certifies is not worth much to a university.
  signature    text,
  signed_by    integer references users(id) on delete set null,
  signed_at    timestamptz,
  -- present | leave | absent | edited
  status       text not null default 'present',
  -- set when an admin allowed a punch from outside the fence
  in_override  boolean not null default false,
  out_override boolean not null default false,
  -- set when an admin typed the times in by hand
  edited_by    integer references users(id) on delete set null,
  edited_at    timestamptz,
  note         text,
  unique (user_id, work_date)
);

create index if not exists attendance_date_idx on attendance(work_date);

create table if not exists override_requests (
  id          serial primary key,
  user_id     integer not null references users(id) on delete cascade,
  work_date   date not null,
  -- in | out
  kind        text not null,
  reason      text not null,
  lat         double precision,
  lng         double precision,
  accuracy    double precision,
  distance    double precision,
  -- pending | approved | rejected
  status      text not null default 'pending',
  decided_by  integer references users(id) on delete set null,
  decided_at  timestamptz,
  created_at  timestamptz not null default now(),
);

create index if not exists override_status_idx on override_requests(status);

create table if not exists work_logs (
  id         serial primary key,
  user_id    integer not null references users(id) on delete cascade,
  work_date  date not null,
  body       text not null,
  updated_at timestamptz not null default now(),
  unique (user_id, work_date)
);

create table if not exists tasks (
  id         serial primary key,
  user_id    integer not null references users(id) on delete cascade,
  title      text not null,
  detail     text,
  done       boolean not null default false,
  due_date   date,
  created_by integer references users(id) on delete set null,
  created_at timestamptz not null default now(),
  done_at    timestamptz,
);

create index if not exists tasks_user_idx on tasks(user_id, done);

create table if not exists leave_requests (
  id         serial primary key,
  user_id    integer not null references users(id) on delete cascade,
  from_date  date not null,
  to_date    date not null,
  reason     text not null,
  -- pending | approved | rejected
  status     text not null default 'pending',
  decided_by integer references users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
);

create index if not exists leave_status_idx on leave_requests(status);

create table if not exists settings (
  key   text primary key,
  value jsonb not null
);

-- The office has no coordinates until somebody stands in it and presses the
-- button in Settings. A guessed fence refuses the people who are actually at
-- work, so the system says so plainly instead of guessing.
insert into settings (key, value) values
  ('office',     '{"lat":null,"lng":null,"radius_m":200,"label":"the office"}'),
  ('hours',      '{"start":"09:00","end":"17:00"}'),
  ('internship', '{"start_date":"2026-09-07","end_date":"2026-12-04"}'),
  ('domains',    '["agthia.com","agthia.ae","alfoah.com"]')
on conflict (key) do nothing;
