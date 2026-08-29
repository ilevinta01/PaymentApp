ALTER TABLE "TenantSettings" ADD COLUMN "isTelegramEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TenantSettings" ADD COLUMN "isCashCollectionEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TenantSettings" ADD COLUMN "isTeacherEarningsEnabled" BOOLEAN NOT NULL DEFAULT false;
