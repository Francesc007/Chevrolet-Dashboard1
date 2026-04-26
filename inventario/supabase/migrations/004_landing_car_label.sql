-- Etiqueta de agrupación (métricas). Orden: tras 003 (vehicle_name); aquí se asegura 003 por si se saltó.
alter table public.landing_interactions
  add column if not exists vehicle_name text;

alter table public.landing_interactions
  add column if not exists car_label text;

comment on column public.landing_interactions.car_label is
  'Nombre mostrado para métricas; misma semántica que vehicle_name en filas nuevas.';

-- Filas existentes: vehicle_name → car_label
update public.landing_interactions
set car_label = nullif(trim(vehicle_name), '')
where (car_label is null or trim(car_label) = '')
  and vehicle_name is not null
  and trim(vehicle_name) <> '';

-- Filas donde solo venga en metadata (evita error "column car_label does not exist" si se corre UPDATE suelto)
update public.landing_interactions
set car_label = nullif(trim(metadata->>'car_label'), '')
where (car_label is null or trim(car_label) = '')
  and metadata->>'car_label' is not null
  and trim(metadata->>'car_label') <> '';

create index if not exists idx_landing_interactions_car_label
  on public.landing_interactions (car_label)
  where car_label is not null;
