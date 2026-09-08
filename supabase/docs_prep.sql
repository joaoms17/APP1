-- Preparação dos documentos (orçamentos/cronogramas com logotipo por projeto).
-- Correr uma vez no SQL Editor. Seguro de repetir.
alter table projects add column if not exists logo_path text;                          -- logotipo no Storage (bucket anexos)
alter table quotes   add column if not exists project_id uuid references projects(id); -- orçamentos por projeto (cabelos/música)
