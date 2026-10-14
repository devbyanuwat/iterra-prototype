-- 001: ตารางทั้งหมดของ backend รอบแรก · ตรงกับ spec หัวข้อ 3
create table admin_users (
  id            bigint generated always as identity primary key,
  email         text not null unique,
  name          text not null,
  password_hash text not null,
  disabled_at   timestamptz,
  created_at    timestamptz not null default now()
);
create table sessions (
  token_hash text primary key,
  user_id    bigint not null references admin_users on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table login_attempts (
  ip_hash text not null,
  at      timestamptz not null default now()
);
create index on login_attempts (ip_hash, at);

create table categories (
  key         text primary key,
  name_th     text not null,
  name_en     text not null,
  multi_brand boolean not null default false,
  sort        int not null default 0
);
create table brands (
  id   bigint generated always as identity primary key,
  name text not null unique
);
create table materials (
  key     text primary key,
  name_th text not null,
  name_en text not null,
  sort    int not null default 0
);
create table products (
  id           bigint generated always as identity primary key,
  slug         text not null unique,
  category_key text not null references categories on delete restrict,
  brand_id     bigint not null references brands on delete restrict,
  material_key text references materials on delete restrict,
  series       text not null default '',
  name_th      text not null,
  name_en      text not null,
  desc_th      text not null default '',
  desc_en      text not null default '',
  specs        jsonb not null default '[]',
  price_th     text,
  price_en     text,
  featured     boolean not null default false,
  images       text[] not null default '{}',
  scenes       text[] not null default '{}',
  published    boolean not null default false,
  sort         int not null default 0,
  updated_at   timestamptz not null default now()
);

create table posts (
  id           bigint generated always as identity primary key,
  slug         text not null unique,
  title_th     text not null,
  title_en     text not null,
  excerpt_th   text not null default '',
  excerpt_en   text not null default '',
  body_th      text not null default '',
  body_en      text not null default '',
  tag_th       text not null default '',
  tag_en       text not null default '',
  cover        text,
  inline       text[] not null default '{}',
  published_at date,
  updated_at   timestamptz not null default now()
);
create table projects (
  id          bigint generated always as identity primary key,
  slug        text not null unique,
  name_th     text not null,
  name_en     text not null,
  location_th text not null default '',
  location_en text not null default '',
  type_th     text not null default '',
  type_en     text not null default '',
  year        int,
  images      text[] not null default '{}',
  published   boolean not null default false,
  sort        int not null default 0
);
create table project_products (
  project_id bigint references projects on delete cascade,
  product_id bigint references products on delete cascade,
  primary key (project_id, product_id)
);

create table announcement (
  id           int primary key default 1 check (id = 1),
  enabled      boolean not null default false,
  seen_key     text not null,
  title_th     text not null,
  title_en     text not null,
  body_th      text not null,
  body_en      text not null,
  image        text,
  cta_label_th text,
  cta_label_en text,
  cta_href     text,
  updated_at   timestamptz not null default now()
);
create table catalog (
  id         int primary key default 1 check (id = 1),
  pdf        text not null,
  page_count int not null,
  size_mb    int not null,
  updated_at timestamptz not null default now()
);

create table inquiries (
  id         bigint generated always as identity primary key,
  name       text not null,
  email      text not null,
  message    text not null,
  ip_hash    text not null,
  emailed_at timestamptz,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
create index on inquiries (ip_hash, created_at);
