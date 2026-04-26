-- Columna `year` en reseñas (además de vehicle_year si existe).
-- `model` debe contener solo el nombre del modelo; el año va en `year`.

alter table public.reviews
  add column if not exists year smallint;

alter table public.reviews drop constraint if exists reviews_review_year_range;

alter table public.reviews
  add constraint reviews_review_year_range
  check (
    year is null
    or (year >= 1900 and year <= 2100)
  );
