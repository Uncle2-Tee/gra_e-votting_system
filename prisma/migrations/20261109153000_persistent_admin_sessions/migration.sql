UPDATE "AdminSession"
SET "expiresAt" = '9999-12-31 23:59:59.999'
WHERE "revokedAt" IS NULL;
