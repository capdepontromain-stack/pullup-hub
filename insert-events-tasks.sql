-- Nouveaux événements
INSERT INTO events (name, client, event_date, status) VALUES
('Loto', 'Casabona', '2026-09-12', 'Confirmé'),
('Team Building CDR', 'CDR', '2026-10-31', 'Confirmé'),
('Team Building Andy et Duke', 'Andy et Duke', '2026-11-28', 'Confirmé'),
('Team Building Exa', 'Exa', '2026-12-18', 'Confirmé'),
('Soirée Ravate Pro', 'Ravate Pro', '2026-12-19', 'Confirmé');

-- Nouvelles tâches pour Ketsia
INSERT INTO tasks (title, assignee_name, priority, status) VALUES
('Relancer Noël Perfabron', 'Ketsia', 'Urgent', 'todo'),
('Relancer Exa — confirmer si tout est ok', 'Ketsia', 'Normal', 'todo');
