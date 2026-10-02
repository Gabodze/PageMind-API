CREATE TABLE "SourcePage" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "faviconUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourcePage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SourcePage_url_key" ON "SourcePage"("url");

ALTER TABLE "notes" ADD COLUMN "sourcePageId" TEXT;

CREATE INDEX "notes_sourcePageId_idx" ON "notes"("sourcePageId");

ALTER TABLE "notes" ADD CONSTRAINT "notes_sourcePageId_fkey"
  FOREIGN KEY ("sourcePageId") REFERENCES "SourcePage"("id") ON DELETE SET NULL ON UPDATE CASCADE;