-- Alinea public.cars con el panel Next.js (proyectos creados a mano o sin 001 completo).
-- Columnas: id, brand, model, year, price, discount_percent, mileage_km, engine,
-- acceleration_0_100_sec, power_hp, condition, cover_image_url, gallery_urls, created_at, updated_at.
-- Renombra typos: brad→brand, millage_km→mileage_km, ecceleration_0_100_sec→acceleration_0_100_sec.
-- Idempotente: se puede ejecutar varias veces en Supabase SQL Editor.

create extension if not exists "pgcrypto";

do $$ begin
  create type car_condition as enum ('nuevo', 'seminuevo');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.cars (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  model text not null,
  year int not null check (year >= 1900 and year <= 2100),
  price numeric(14, 2) not null check (price >= 0),
  discount_percent numeric(5, 2) not null default 0 check (discount_percent >= 0 and discount_percent <= 100),
  mileage_km int not null default 0 check (mileage_km >= 0),
  engine text,
  acceleration_0_100_sec numeric(5, 2),
  power_hp int,
  condition car_condition not null default 'seminuevo'::car_condition,
  cover_image_url text,
  gallery_urls text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'cars' and column_name = 'brad'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'cars' and column_name = 'brand'
  ) then
    alter table public.cars rename column brad to brand;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'cars' and column_name = 'millage_km'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'cars' and column_name = 'mileage_km'
  ) then
    alter table public.cars rename column millage_km to mileage_km;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'cars' and column_name = 'ecceleration_0_100_sec'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'cars' and column_name = 'acceleration_0_100_sec'
  ) then
    alter table public.cars rename column ecceleration_0_100_sec to acceleration_0_100_sec;
  end if;
end $$;

alter table public.cars add column if not exists brand text;
alter table public.cars add column if not exists model text;
alter table public.cars add column if not exists year int;
alter table public.cars add column if not exists price numeric(14, 2);
alter table public.cars add column if not exists discount_percent numeric(5, 2) default 0;
alter table public.cars add column if not exists mileage_km int default 0;
alter table public.cars add column if not exists engine text;
alter table public.cars add column if not exists acceleration_0_100_sec numeric(5, 2);
alter table public.cars add column if not exists power_hp int;
alter table public.cars add column if not exists cover_image_url text;

do $$ begin
  alter table public.cars add column gallery_urls text[] not null default '{}';
exception
  when duplicate_column then null;
end $$;

do $$ begin
  alter table public.cars
    add column condition car_condition not null default 'seminuevo'::car_condition;
exception
  when duplicate_column then null;
end $$;

alter table public.cars add column if not exists created_at timestamptz default now();
alter table public.cars add column if not exists updated_at timestamptz default now();

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'cars' and constraint_type = 'PRIMARY KEY'
  ) then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'cars' and column_name = 'id'
    ) then
      alter table public.cars add primary key (id);
    else
      alter table public.cars add column id uuid default gen_random_uuid() not null;
      alter table public.cars add primary key (id);
    end if;
  end if;
end $$;

alter table public.cars drop constraint if exists gallery_max_five;
alter table public.cars drop constraint if exists gallery_max_four_gallery_urls;
alter table public.cars drop constraint if exists cars_gallery_max_four;
do $$ begin
  alter table public.cars add constraint cars_gallery_max_four
    check (coalesce(cardinality(gallery_urls), 0) <= 4);
exception
  when duplicate_object then null;
end $$;

update public.cars set brand = coalesce(nullif(trim(brand), ''), 'Sin dato') where brand is null;
update public.cars set model = coalesce(nullif(trim(model), ''), 'Sin dato') where model is null;
update public.cars set year = extract(year from now())::int where year is null;
update public.cars set price = coalesce(price, 0) where price is null;
update public.cars set discount_percent = coalesce(discount_percent, 0) where discount_percent is null;
update public.cars set mileage_km = coalesce(mileage_km, 0) where mileage_km is null;
update public.cars set gallery_urls = coalesce(gallery_urls, '{}') where gallery_urls is null;
update public.cars set created_at = coalesce(created_at, now()) where created_at is null;
update public.cars set updated_at = coalesce(updated_at, now()) where updated_at is null;

alter table public.cars alter column brand set not null;
alter table public.cars alter column model set not null;
alter table public.cars alter column year set not null;
alter table public.cars alter column price set not null;
alter table public.cars alter column discount_percent set not null;
alter table public.cars alter column mileage_km set not null;
alter table public.cars alter column gallery_urls set not null;
alter table public.cars alter column created_at set not null;
alter table public.cars alter column updated_at set not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cars_updated_at on public.cars;
create trigger cars_updated_at
  before update on public.cars
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
