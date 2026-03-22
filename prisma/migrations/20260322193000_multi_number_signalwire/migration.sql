ALTER TABLE "Conversation"
ADD COLUMN "userPhoneNumber" TEXT,
ADD COLUMN "servicePhoneNumber" TEXT;

UPDATE "Conversation" c
SET
  "userPhoneNumber" = c."phoneNumber",
  "servicePhoneNumber" = COALESCE(
    (
      SELECT m."toNumber"
      FROM "Message" m
      WHERE m."conversationId" = c."id"
        AND m."direction" = 'inbound'
      ORDER BY m."createdAt" ASC
      LIMIT 1
    ),
    (
      SELECT m."fromNumber"
      FROM "Message" m
      WHERE m."conversationId" = c."id"
        AND m."direction" = 'outbound'
      ORDER BY m."createdAt" ASC
      LIMIT 1
    ),
    c."phoneNumber"
  );

ALTER TABLE "Conversation"
ALTER COLUMN "userPhoneNumber" SET NOT NULL,
ALTER COLUMN "servicePhoneNumber" SET NOT NULL;

DROP INDEX "Conversation_phoneNumber_status_idx";

ALTER TABLE "Conversation"
DROP COLUMN "phoneNumber";

CREATE INDEX "Conversation_userPhoneNumber_servicePhoneNumber_status_idx"
ON "Conversation"("userPhoneNumber", "servicePhoneNumber", "status");

ALTER TABLE "OptOut"
ADD COLUMN "userPhoneNumber" TEXT,
ADD COLUMN "servicePhoneNumber" TEXT;

UPDATE "OptOut" o
SET
  "userPhoneNumber" = o."phoneNumber",
  "servicePhoneNumber" = COALESCE(
    (
      SELECT m."toNumber"
      FROM "Message" m
      WHERE m."fromNumber" = o."phoneNumber"
      ORDER BY m."createdAt" DESC
      LIMIT 1
    ),
    o."phoneNumber"
  );

ALTER TABLE "OptOut"
ALTER COLUMN "userPhoneNumber" SET NOT NULL,
ALTER COLUMN "servicePhoneNumber" SET NOT NULL;

DROP INDEX "OptOut_phoneNumber_key";

ALTER TABLE "OptOut"
DROP COLUMN "phoneNumber";

CREATE UNIQUE INDEX "OptOut_userPhoneNumber_servicePhoneNumber_key"
ON "OptOut"("userPhoneNumber", "servicePhoneNumber");
