import { BadRequestException, Body, Controller, Get, Patch, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { JwtPayload, Role } from "@oplata/shared";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { UpdateTenantSettingsDto } from "./dto/update-tenant-settings.dto";
import { TenantSettingsService } from "./tenant-settings.service";

const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];

@Controller("tenant-settings")
export class TenantSettingsController {
  constructor(private readonly service: TenantSettingsService) {}

  @Get()
  get(@CurrentUser() user: JwtPayload) {
    return this.service.get(user.tenantId);
  }

  @Roles(Role.SUPER_ADMIN)
  @Get("telegram-chats")
  getTelegramChats(@CurrentUser() user: JwtPayload) {
    return this.service.getTelegramChats(user.tenantId);
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch()
  update(@CurrentUser() user: JwtPayload, @Body() dto: UpdateTenantSettingsDto) {
    return this.service.update(user.tenantId, dto);
  }

  @Roles(Role.SUPER_ADMIN)
  @Post("logo")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: 1024 * 1024 } }))
  uploadLogo(@CurrentUser() user: JwtPayload, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("Файл логотипа не получен");
    if (!ALLOWED_LOGO_TYPES.includes(file.mimetype)) {
      throw new BadRequestException("Логотип должен быть PNG, JPEG, WebP или SVG");
    }
    const dataUrl = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
    return this.service.setLogo(user.tenantId, dataUrl);
  }
}
