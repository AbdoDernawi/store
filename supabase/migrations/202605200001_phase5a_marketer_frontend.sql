alter table public.marketer_customers
add column if not exists customer_address text,
add column if not exists city_id uuid references public.cities(id) on delete set null,
add column if not exists zone_id uuid references public.zones(id) on delete set null;

create index if not exists idx_marketer_customers_recent
on public.marketer_customers(marketer_id, last_ordered_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'transfer-images',
  'transfer-images',
  false,
  5242880,
  array['image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists transfer_images_owner_insert on storage.objects;
create policy transfer_images_owner_insert
on storage.objects for insert
with check (
  bucket_id = 'transfer-images'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists transfer_images_owner_select on storage.objects;
create policy transfer_images_owner_select
on storage.objects for select
using (
  bucket_id = 'transfer-images'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or private.is_admin()
  )
);

drop policy if exists transfer_images_owner_delete on storage.objects;
create policy transfer_images_owner_delete
on storage.objects for delete
using (
  bucket_id = 'transfer-images'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or private.is_admin()
  )
);

create or replace function public.get_marketer_catalog()
returns table (
  id uuid,
  category_id uuid,
  category_name text,
  name_ar text,
  description_ar text,
  images jsonb,
  marketer_price numeric,
  variants jsonb
)
language sql
stable
security definer
set search_path = public, private
as $$
  select
    p.id,
    p.category_id,
    c.name_ar as category_name,
    p.name_ar,
    p.description_ar,
    p.images,
    p.marketer_price,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', pv.id,
          'color', pv.color,
          'size', pv.size,
          'type', pv.type,
          'image_url', pv.image_url,
          'extra_price', pv.extra_price
        )
        order by pv.color nulls last, pv.size nulls last, pv.type nulls last
      ) filter (where pv.id is not null),
      '[]'::jsonb
    ) as variants
  from public.products p
  left join public.categories c on c.id = p.category_id and c.is_active = true
  left join public.product_variants pv on pv.product_id = p.id and pv.is_active = true
  where p.is_active = true
    and private.current_user_role() = 'marketer'
  group by p.id, c.name_ar
  order by p.created_at desc;
$$;

grant execute on function public.get_marketer_catalog() to authenticated, service_role;
