-- BuildMetry — Migration 002: Project Phases
-- Creates the ProjectPhase table and seeds default phases for existing companies

-- ── ProjectPhase Table ────────────────────────────────
CREATE TABLE IF NOT EXISTS "ProjectPhase" (
    "id"        SERIAL PRIMARY KEY,
    "companyId" INTEGER NOT NULL,
    "name"      TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectPhase_companyId_fkey"
        FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectPhase_companyId_name_key"
        UNIQUE ("companyId", "name")
);

CREATE INDEX IF NOT EXISTS "ProjectPhase_companyId_idx" ON "ProjectPhase"("companyId");

-- ── Seed default phases for every existing company ───
INSERT INTO "ProjectPhase" ("companyId", "name", "sortOrder")
SELECT c."id", phases."name", phases."sortOrder"
FROM "Company" c
CROSS JOIN (VALUES
    (0, 'Planning'),
    (1, 'Design'),
    (2, 'Permitting'),
    (3, 'Demolition'),
    (4, 'Site Prep'),
    (5, 'Rough-In'),
    (6, 'Installations'),
    (7, 'Finishes'),
    (8, 'Closeout & Punch List')
) AS phases("sortOrder", "name")
ON CONFLICT ("companyId", "name") DO UPDATE
    SET "sortOrder" = EXCLUDED."sortOrder";
