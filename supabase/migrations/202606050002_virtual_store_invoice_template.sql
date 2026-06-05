alter table public.virtual_stores
  add column if not exists invoice_template text not null default 'modern'
  check (invoice_template in ('modern', 'classic', 'soft'));
