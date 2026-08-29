import { SetMetadata } from "@nestjs/common";

export type TenantFeature =
  | "isCardEnabled"
  | "isTelegramEnabled"
  | "isCashCollectionEnabled"
  | "isTeacherEarningsEnabled";

export const FEATURE_KEY = "tenantFeature";
export const RequireFeature = (feature: TenantFeature) => SetMetadata(FEATURE_KEY, feature);
