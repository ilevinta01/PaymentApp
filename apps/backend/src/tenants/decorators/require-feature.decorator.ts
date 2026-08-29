import { SetMetadata } from "@nestjs/common";
import { FeatureKey } from "@oplata/shared";

export const FEATURE_KEY = "tenantFeature";
export const RequireFeature = (feature: FeatureKey) => SetMetadata(FEATURE_KEY, feature);
