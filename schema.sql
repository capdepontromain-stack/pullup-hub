-- =============================================
-- PULL UP HUB — Schéma Supabase complet
-- =============================================

-- Activer UUID
create extension if not exists "uuid-ossp";

-- =============================================
-- PROFILS UTILISATEURS
-- =============================================
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  role text not null default 'collaborateur',
  phone text,
  avatar_color text default '#333333',
  avatar_letter text,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Lecture profils" on profiles for select using (auth.role() = 'authenticated');
create policy "Modifier son profil" on profiles for update using (auth.uid() = id);

-- =============================================
-- ÉVÉNEMENTS
-- =============================================
create table if not exists events (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  client text,
  event_date date,
  start_time time,
  end_time time,
  location text,
  contact_name text,
  contact_phone text,
  participants int,
  team text[],
  budget numeric(10,2),
  status text default 'En préparation',
  notes text,
  amount_ht numeric(10,2),
  paid boolean default false,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table events enable row level security;
create policy "Tous voient les événements" on events for select using (auth.role() = 'authenticated');
create policy "Créer événement" on events for insert with check (auth.role() = 'authenticated');
create policy "Modifier événement" on events for update using (auth.role() = 'authenticated');
create policy "Supprimer événement" on events for delete using (auth.role() = 'authenticated');

-- Checklists événements
create table if not exists event_checklists (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references events(id) on delete cascade,
  phase text not null, -- 'preparation', 'jour_j', 'demontage'
  item text not null,
  done boolean default false,
  created_at timestamptz default now()
);
alter table event_checklists enable row level security;
create policy "Checklists" on event_checklists for all using (auth.role() = 'authenticated');

-- =============================================
-- TÂCHES
-- =============================================
create table if not exists tasks (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  assignee_id uuid references profiles(id),
  assignee_name text,
  event_id uuid references events(id) on delete set null,
  due_date date,
  priority text default 'Normal', -- Urgent, Normal, Bas
  status text default 'todo', -- todo, inprogress, waiting, done
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table tasks enable row level security;
create policy "Voir tâches" on tasks for select using (auth.role() = 'authenticated');
create policy "Créer tâche" on tasks for insert with check (auth.role() = 'authenticated');
create policy "Modifier tâche" on tasks for update using (auth.role() = 'authenticated');
create policy "Supprimer tâche" on tasks for delete using (auth.role() = 'authenticated');

-- Commentaires tâches
create table if not exists task_comments (
  id uuid default uuid_generate_v4() primary key,
  task_id uuid references tasks(id) on delete cascade,
  author_id uuid references profiles(id),
  author_name text,
  content text not null,
  created_at timestamptz default now()
);
alter table task_comments enable row level security;
create policy "Commentaires" on task_comments for all using (auth.role() = 'authenticated');

-- =============================================
-- CLIENTS CRM
-- =============================================
create table if not exists clients (
  id uuid default uuid_generate_v4() primary key,
  company text not null,
  contact_name text,
  phone text,
  email text,
  revenue numeric(10,2) default 0,
  potential text default 'Moyen', -- Élevé, Moyen, Faible
  status text default 'Prospect', -- Actif, Prospect, Inactif, Relance
  last_contact date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table clients enable row level security;
create policy "Clients" on clients for all using (auth.role() = 'authenticated');

-- =============================================
-- FOURNISSEURS
-- =============================================
create table if not exists suppliers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  category text, -- Traiteur, DJ, Animateur, Hôtesse, etc.
  phone text,
  email text,
  price_range text,
  rating int default 4,
  notes text,
  collaborations int default 0,
  created_at timestamptz default now()
);
alter table suppliers enable row level security;
create policy "Fournisseurs" on suppliers for all using (auth.role() = 'authenticated');

-- =============================================
-- MESSAGERIE
-- =============================================
create table if not exists messages (
  id uuid default uuid_generate_v4() primary key,
  channel text not null default 'general', -- general, annonces, ou event_id
  author_id uuid references profiles(id),
  author_name text,
  content text not null,
  reactions jsonb default '{}',
  created_at timestamptz default now()
);
alter table messages enable row level security;
create policy "Voir messages" on messages for select using (auth.role() = 'authenticated');
create policy "Envoyer message" on messages for insert with check (auth.uid() = author_id);

-- =============================================
-- FRAIS KILOMÉTRIQUES
-- =============================================
create table if not exists mileage (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id),
  user_name text,
  trip_date date not null,
  departure text,
  destination text,
  km numeric(8,2),
  motif text,
  rate numeric(5,3) default 0.374,
  amount numeric(8,2),
  created_at timestamptz default now()
);
alter table mileage enable row level security;
create policy "Voir ses KMs" on mileage for select using (auth.role() = 'authenticated');
create policy "Saisir ses KMs" on mileage for insert with check (auth.uid() = user_id);
create policy "Modifier ses KMs" on mileage for update using (auth.uid() = user_id);
create policy "Supprimer ses KMs" on mileage for delete using (auth.uid() = user_id);

-- =============================================
-- FINANCES
-- =============================================
create table if not exists finances (
  id uuid default uuid_generate_v4() primary key,
  type text not null, -- 'facture', 'devis', 'paiement'
  client text,
  event_id uuid references events(id) on delete set null,
  amount numeric(10,2),
  invoice_date date,
  due_date date,
  paid_date date,
  status text default 'En attente', -- Payée, En attente, En retard, Envoyé, Fait
  notes text,
  created_at timestamptz default now()
);
alter table finances enable row level security;
create policy "Finances" on finances for all using (auth.role() = 'authenticated');

-- =============================================
-- INVENTAIRE MATÉRIEL
-- =============================================
create table if not exists inventory (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  quantity int default 1,
  condition text default 'Bon état', -- Bon état, Vérifier, À réparer
  location text,
  price_per_day numeric(8,2),
  purchase_price numeric(10,2),
  notes text,
  emoji text default '📦',
  created_at timestamptz default now()
);
alter table inventory enable row level security;
create policy "Inventaire" on inventory for all using (auth.role() = 'authenticated');

-- =============================================
-- BASE DE CONNAISSANCES
-- =============================================
create table if not exists knowledge (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  category text, -- Animation micro, Team Building, etc.
  content text,
  type text default 'document', -- document, checklist, tutorial, faq
  author_id uuid references profiles(id),
  author_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table knowledge enable row level security;
create policy "Connaissances" on knowledge for all using (auth.role() = 'authenticated');

-- =============================================
-- PERSONNEL — CONGÉS & HEURES
-- =============================================
create table if not exists personnel_records (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id),
  record_date date not null,
  type text not null, -- 'bureau', 'terrain', 'formation', 'conge', 'maladie', 'ferie', 'rtt'
  hours numeric(4,2) default 7,
  notes text,
  created_at timestamptz default now()
);
alter table personnel_records enable row level security;
create policy "Personnel records" on personnel_records for all using (auth.role() = 'authenticated');

-- =============================================
-- LIENS RAPIDES
-- =============================================
create table if not exists quick_links (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  url text not null,
  category text default 'Réseaux sociaux',
  emoji text default '🔗',
  created_at timestamptz default now()
);
alter table quick_links enable row level security;
create policy "Liens" on quick_links for all using (auth.role() = 'authenticated');

-- =============================================
-- MODÈLES DE MAILS
-- =============================================
create table if not exists mail_templates (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  category text,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table mail_templates enable row level security;
create policy "Modèles mails" on mail_templates for all using (auth.role() = 'authenticated');

-- =============================================
-- DONNÉES INITIALES
-- =============================================

-- Fournisseurs (traiteurs réels)
insert into suppliers (name, category, phone, rating, collaborations) values
  ('Dany Royal Traiteur', 'Traiteur', '06 92 39 83 60', 5, 8),
  ('David KLB Traiteur', 'Traiteur', '06 93 32 75 85', 4, 6),
  ('Alexandre Traiteur', 'Traiteur', '06 92 39 83 60', 4, 4),
  ('Eric Traiteur de l''Ouest', 'Traiteur', '06 92 29 03 54', 4, 5),
  ('Julien Traiteur (Ti Julien)', 'Traiteur', '06 92 79 71 05', 5, 10),
  ('Les Frères Dijoux', 'Traiteur', '06 92 77 53 94', 4, 7),
  ('My Traiteur', 'Traiteur', '06 93 50 08 93', 4, 3),
  ('Jeremy L''Encrin', 'Traiteur', '06 92 90 09 00', 5, 9)
on conflict do nothing;

-- Clients réels
insert into clients (company, contact_name, email, revenue, potential, status) values
  ('Mercialys', 'Emilie', 'eboyer@mercialys.com', 28000, 'Élevé', 'Actif'),
  ('Casabona', '', '', 13000, 'Élevé', 'Actif'),
  ('CILAM', '', '', 8700, 'Élevé', 'Actif'),
  ('Lolipop', 'Océane', '', 7000, 'Élevé', 'Actif'),
  ('MIO', '', '', 7900, 'Moyen', 'Actif'),
  ('Sudeco', '', '', 4032, 'Moyen', 'Actif'),
  ('Adapéi', '', '', 4200, 'Moyen', 'Actif'),
  ('Croix Rouge', '', '', 4006, 'Moyen', 'Actif'),
  ('Mission Locale Nord', '', '', 900, 'Moyen', 'Relance'),
  ('CSE IRT', 'Mardaye Muriel', 'cse@reunion.fr', 0, 'Élevé', 'Prospect'),
  ('INSEE Réunion', 'Jocelyne Damour', 'dr974-comunication-interne@insee.fr', 0, 'Élevé', 'Prospect'),
  ('AFPAR', 'Mme Riviere', 'n.burel@afpar.com', 0, 'Élevé', 'Prospect'),
  ('CSE CYCLEA', 'Aurelie Pader', 'a.pader@cyclea.fr', 0, 'Élevé', 'Prospect'),
  ('CSE SIDR', 'Olivia Guichard', 'olivia_joanny@sidr.fr', 0, 'Élevé', 'Prospect'),
  ('CSE FAVRON', 'Elodie Omerally', 'e.omeraly@favron.org', 0, 'Moyen', 'Prospect'),
  ('Ecole Iris Hoarau', 'Christine Audifax', 'ce.9740411D@ac-reunion.fr', 0, 'Moyen', 'Prospect')
on conflict do nothing;

-- Inventaire matériel réel
insert into inventory (name, quantity, condition, price_per_day, purchase_price, emoji, location) values
  ('Photo Box (Kap Numérique)', 1, 'Bon état', null, 4700, '📷', 'Bureau'),
  ('Ventrigliss DK (Grand 💧)', 1, 'Bon état', 450, null, '🎪', 'Dépôt Réunion'),
  ('Mickey et Minnie DK (Grand)', 1, 'Bon état', 450, null, '🐭', 'Dépôt Réunion'),
  ('Aire de jeux Aquatique DK (Moyen 💧)', 1, 'Bon état', 450, null, '🌊', 'Dépôt Réunion'),
  ('Z''''Animaux Safari RF', 1, 'Bon état', 200, null, '🦁', 'Dépôt Réunion'),
  ('Bateau Pirate RF', 1, 'Bon état', 200, null, '🏴‍☠️', 'Dépôt Réunion'),
  ('Toboggan Piton Grand''''Anse RF (Grand 💧)', 1, 'Bon état', 200, null, '🌊', 'Dépôt Réunion'),
  ('Machine Gaufre DK (x3)', 3, 'Bon état', null, null, '🧇', 'Bureau'),
  ('Surveillant RF', 1, 'Bon état', 80, null, '👁️', 'Prestation')
on conflict do nothing;

-- Liens rapides
insert into quick_links (name, url, category, emoji) values
  ('Facebook Pull Up', 'https://facebook.com/pullup', 'Réseaux sociaux', '📘'),
  ('Instagram Pull Up', 'https://instagram.com/pullup_evenements', 'Réseaux sociaux', '📸'),
  ('TikTok Pull Up', 'https://tiktok.com/@pullup_events', 'Réseaux sociaux', '🎵'),
  ('YouTube Pull Up', 'https://youtube.com/@pullup', 'Réseaux sociaux', '▶️'),
  ('Google Drive', 'https://drive.google.com', 'Outils', '📁'),
  ('Canva Pull Up', 'https://canva.com', 'Outils', '🎨'),
  ('Site internet', 'https://pullup-evenements.fr', 'Site', '🌐'),
  ('Avis Google', 'https://g.page/pullup-evenements', 'Avis', '⭐')
on conflict do nothing;

-- Modèles de mails
insert into mail_templates (title, category, content) values
  ('Mail Salon CSE (officiel)', 'Commercial',
'Bonjour,

Nous avons eu le plaisir d''échanger avec vous lors du Salon du CSE à la Nordev et nous vous remercions pour ce moment.
Nous revenons vers vous concernant votre projet de [ex : Arbre de Noël / Team building / Soirée d''entreprise].

Nous serions ravis de vous accompagner sur cette prestation et de vous proposer une formule adaptée à vos attentes, à votre budget ainsi qu''à vos contraintes logistiques.

Afin d''avancer, nous pouvons :
– organiser un échange rapide par téléphone
– fixer un rendez-vous
– ou vous transmettre directement une proposition détaillée

Vous trouverez en fin de mail quelques vidéos de nos réalisations similaires :
Team building : https://www.youtube.com/watch?v=UZ2BUXB7fwQ

Bien cordialement,
Romain Capdepont — Président
Pull Up Événements | 97490 Sainte-Clotilde'),
  ('Relance devis', 'Commercial',
'Bonjour [Prénom],

Je me permets de revenir vers vous concernant le devis n°[NUMERO] que nous vous avons transmis le [DATE].

Nous restons disponibles pour tout échange ou ajustement.

Bien cordialement,
Romain Capdepont — Pull Up Événements'),
  ('Relance facture', 'Facturation',
'Bonjour [Prénom],

Sauf erreur de notre part, la facture n°[NUMERO] d''un montant de [MONTANT] € datant du [DATE] est toujours en attente de règlement.

Pourriez-vous nous confirmer la date de paiement ?

Bien cordialement,
Pull Up Événements'),
  ('Remerciement client', 'Relation client',
'Bonjour [Prénom],

Nous tenons à vous remercier chaleureusement pour la confiance que vous nous avez accordée lors de [EVENEMENT].

Ce fut un réel plaisir de collaborer avec vous. Nous espérons avoir l''opportunité de renouveler cette expérience.

Bien cordialement,
Pull Up Événements'),
  ('Compte rendu événement', 'Post-event',
'Bonjour [Prénom],

Veuillez trouver ci-joint le compte rendu de [EVENEMENT] qui s''est déroulé le [DATE].

Points positifs : [À COMPLÉTER]
Points d''amélioration : [À COMPLÉTER]

Merci pour votre confiance.
Pull Up Événements'),
  ('Demande de partenariat', 'Partenariat',
'Bonjour [Prénom],

Je suis Romain Capdepont, président de Pull Up Événements, agence spécialisée dans l''animation et l''organisation d''événements à La Réunion.

Je vous contacte afin d''explorer une possible collaboration entre nos structures.

Seriez-vous disponible pour un échange ?

Bien cordialement,
Romain Capdepont')
on conflict do nothing;
