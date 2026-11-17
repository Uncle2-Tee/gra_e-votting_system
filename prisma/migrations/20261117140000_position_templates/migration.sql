CREATE TABLE "PositionTemplate" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PositionTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PositionTemplate_displayOrder_idx" ON "PositionTemplate"("displayOrder");

WITH unique_titles AS (
    SELECT DISTINCT ON (LOWER("title"))
        "title",
        "displayOrder",
        "createdAt"
    FROM "Position"
    ORDER BY LOWER("title"), "displayOrder", "createdAt"
),
ordered_titles AS (
    SELECT
        "title",
        ROW_NUMBER() OVER (ORDER BY "displayOrder", "createdAt", LOWER("title")) - 1 AS "displayOrder"
    FROM unique_titles
)
INSERT INTO "PositionTemplate" ("id", "title", "displayOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "title", "displayOrder", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM ordered_titles;
