create table if not exists duerp_leads (
  id uuid primary key,
  email text,
  company text,
  contact_name text,
  sector text,
  country text,
  employees integer,
  score integer,
  critical_risks integer,
  temperature text,
  payload jsonb,
  created_at timestamptz default now()
);
create index if not exists duerp_leads_created_at_idx on duerp_leads(created_at desc);
create index if not exists duerp_leads_temperature_idx on duerp_leads(temperature);
