-- Tabla "libros" para la práctica (Supabase / PostgreSQL)
create extension if not exists "pgcrypto";

create table if not exists libros (
  id              uuid primary key default gen_random_uuid(),
  titulo          text not null,
  autor           text not null,
  genero          text not null,
  paginas         integer not null check (paginas > 0),
  estado          text not null default 'Pendiente'
                    check (estado in ('Pendiente','Leyendo','Leído')),
  notas           text,
  fecha_registro  timestamptz not null default now()
);

-- Seguridad: activar RLS y permitir acceso con la clave pública (anon)
alter table libros enable row level security;

create policy "Lectura pública"    on libros for select using (true);
create policy "Insertar público"   on libros for insert with check (true);
create policy "Actualizar público" on libros for update using (true);
create policy "Eliminar público"   on libros for delete using (true);
