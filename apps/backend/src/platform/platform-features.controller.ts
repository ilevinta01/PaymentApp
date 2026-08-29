import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { Public } from "../auth/decorators/public.decorator";
import { UpdateFeaturePriceDto } from "./dto/update-feature-price.dto";
import { PlatformAdminGuard } from "./guards/platform-admin.guard";
import { PlatformService } from "./platform.service";

// Глобальный прайс-лист функций — отдельно от platform/tenants, т.к. не привязан к конкретной школе.
@Public()
@UseGuards(PlatformAdminGuard)
@Controller("platform/features")
export class PlatformFeaturesController {
  constructor(private readonly service: PlatformService) {}

  @Get()
  getFeaturePrices() {
    return this.service.getFeaturePrices();
  }

  @Patch(":key")
  updateFeaturePrice(@Param("key") key: string, @Body() dto: UpdateFeaturePriceDto) {
    return this.service.updateFeaturePrice(key, dto.price);
  }
}
