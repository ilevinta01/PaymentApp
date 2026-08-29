import { randomUUID } from "crypto";
import { existsSync, mkdirSync, createReadStream } from "fs";
import { extname, join } from "path";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage, memoryStorage } from "multer";
import { Public } from "../auth/decorators/public.decorator";
import { CreateTenantDto } from "./dto/create-tenant.dto";
import { UpdateBrandingDto } from "./dto/update-branding.dto";
import { UpdateFeaturesDto } from "./dto/update-features.dto";
import { UpdateSubscriptionDto } from "./dto/update-subscription.dto";
import { PlatformAdminGuard } from "./guards/platform-admin.guard";
import { PlatformService } from "./platform.service";

const UPLOADS_DIR = join(process.cwd(), "uploads", "contracts");
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];

// @Public() снимает тенантные JWT/Subscription guard'ы — доступ сюда защищён отдельным
// PlatformAdminGuard (X-Platform-Key), т.к. это API владельца платформы, а не тенанта.
@Public()
@UseGuards(PlatformAdminGuard)
@Controller("platform/tenants")
export class PlatformController {
  constructor(private readonly service: PlatformService) {}

  @Get()
  listTenants() {
    return this.service.listTenants();
  }

  @Post()
  createTenant(@Body() dto: CreateTenantDto) {
    return this.service.createTenant(dto);
  }

  @Patch(":id/subscription")
  updateSubscription(@Param("id") id: string, @Body() dto: UpdateSubscriptionDto) {
    return this.service.updateSubscription(id, dto);
  }

  @Post(":id/contract")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });
          cb(null, UPLOADS_DIR);
        },
        filename: (_req, file, cb) => cb(null, `${Date.now()}-${randomUUID()}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadContract(@Param("id") id: string, @UploadedFile() file: Express.Multer.File) {
    return this.service.saveContract(id, file.filename);
  }

  @Get(":id/contract")
  async downloadContract(@Param("id") id: string): Promise<StreamableFile> {
    const tenant = await this.service.getTenant(id);
    if (!tenant?.contractFileUrl) throw new NotFoundException("Контракт не загружен");
    return new StreamableFile(createReadStream(join(UPLOADS_DIR, tenant.contractFileUrl)));
  }

  @Patch(":id/branding")
  updateBranding(@Param("id") id: string, @Body() dto: UpdateBrandingDto) {
    return this.service.updateBranding(id, dto.primaryColor);
  }

  @Post(":id/logo")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: 1024 * 1024 } }))
  uploadLogo(@Param("id") id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("Файл логотипа не получен");
    if (!ALLOWED_LOGO_TYPES.includes(file.mimetype)) {
      throw new BadRequestException("Логотип должен быть PNG, JPEG, WebP или SVG");
    }
    const dataUrl = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
    return this.service.saveLogo(id, dataUrl);
  }

  @Patch(":id/features")
  updateFeatures(@Param("id") id: string, @Body() dto: UpdateFeaturesDto) {
    return this.service.updateFeatures(id, dto);
  }
}
