-- Inflammation Kitchen: run once in Supabase > SQL Editor
create table if not exists menu_draft (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists menu_published (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table menu_draft enable row level security;
alter table menu_published enable row level security;

-- Everyone can read the published menu; only the signed-in admin can change anything
create policy "public reads published" on menu_published for select using (true);
create policy "admin manages published" on menu_published for all to authenticated using (true) with check (true);
create policy "admin manages draft" on menu_draft for all to authenticated using (true) with check (true);

insert into menu_draft (id) values (1) on conflict do nothing;
insert into menu_published (id) values (1) on conflict do nothing;
-- Empty data means the site shows its built-in default menu until you publish from the admin panel.
