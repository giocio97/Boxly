-- Boxly — dati demo (CONTRACT §5). Password di tutti: password123

-- Utenti (login reale: password bcrypt, token '' non null, identity email)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
       extensions.crypt('password123', extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       jsonb_build_object('display_name', u.display_name), now(), now(),
       '', '', '', '', '', '', '', ''
  from (values
    ('00000000-0000-0000-0000-00000000000a'::uuid, 'alice@boxly.test', 'Alice'),
    ('00000000-0000-0000-0000-00000000000b'::uuid, 'bob@boxly.test',   'Bob'),
    ('00000000-0000-0000-0000-00000000000c'::uuid, 'carol@boxly.test', 'Carol')
  ) as u (id, email, display_name);

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select u.id, u.id, u.id::text, 'email',
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
       now(), now(), now()
  from auth.users u
 where u.id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b',
                '00000000-0000-0000-0000-00000000000c');

-- Scatole
insert into public.boxes (id, owner_id, name, location, season) values
  ('11111111-1111-1111-1111-000000000001', '00000000-0000-0000-0000-00000000000a', 'Inverno 2025', 'Cantina',         'winter'),
  ('11111111-1111-1111-1111-000000000002', '00000000-0000-0000-0000-00000000000a', 'Estate',       'Armadio camera',  'summer'),
  ('11111111-1111-1111-1111-000000000003', '00000000-0000-0000-0000-00000000000b', 'Libri',        'Garage',          'all');

insert into public.box_shares (box_id, user_id, role) values
  ('11111111-1111-1111-1111-000000000001', '00000000-0000-0000-0000-00000000000b', 'viewer'),
  ('11111111-1111-1111-1111-000000000002', '00000000-0000-0000-0000-00000000000b', 'editor');

-- Oggetti: impostiamo l'utente corrente così lo storico ('added') ha actor_id.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', false);

insert into public.items (id, box_id, name, brand, color, category, size, season, created_by) values
  ('22222222-2222-2222-2222-000000000001', '11111111-1111-1111-1111-000000000001', 'Maglione blu',        'Uniqlo',         'blu',    'Abbigliamento', 'M',  'winter', '00000000-0000-0000-0000-00000000000a'),
  ('22222222-2222-2222-2222-000000000002', '11111111-1111-1111-1111-000000000001', 'Piumino nero',        'The North Face', 'nero',   'Abbigliamento', null, 'winter', '00000000-0000-0000-0000-00000000000a'),
  ('22222222-2222-2222-2222-000000000003', '11111111-1111-1111-1111-000000000001', 'Sciarpa grigia',      null,             'grigio', 'Accessori',     null, 'winter', '00000000-0000-0000-0000-00000000000a'),
  ('22222222-2222-2222-2222-000000000004', '11111111-1111-1111-1111-000000000002', 'Costume rosso',       null,             'rosso',  'Mare',          null, 'summer', '00000000-0000-0000-0000-00000000000a'),
  ('22222222-2222-2222-2222-000000000005', '11111111-1111-1111-1111-000000000002', 'Camicia lino bianca', null,             'bianco', 'Abbigliamento', null, 'summer', '00000000-0000-0000-0000-00000000000a');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', false);

insert into public.items (id, box_id, name, category, season, created_by) values
  ('22222222-2222-2222-2222-000000000006', '11111111-1111-1111-1111-000000000003', 'Libro "Il nome della rosa"', 'Libri', 'all', '00000000-0000-0000-0000-00000000000b');

select set_config('request.jwt.claims', '', false);
