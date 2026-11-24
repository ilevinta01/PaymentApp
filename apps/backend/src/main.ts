import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { AppModule } from "./app.module";

// Сайты, которым разрешено обращаться к API из браузера. Можно переопределить переменной CORS_ORIGINS
// (список через запятую). Запросы без Origin (Telegram, проверки /health, curl) CORS не касается.
const DEFAULT_ORIGINS = ["https://paymentsmall.netlify.app"];
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function isAllowedOrigin(origin: string): boolean {
  const configured = process.env.CORS_ORIGINS?.split(",").map((o) => o.trim().replace(/\/+$/, "")).filter(Boolean);
  const allowed = configured?.length ? configured : DEFAULT_ORIGINS;
  if (allowed.includes(origin)) return true;
  // Локальная разработка — только когда сервер запущен не в боевом режиме.
  return process.env.NODE_ENV !== "production" && LOCAL_ORIGIN.test(origin);
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Сервер стоит за прокси Render — берём настоящий IP посетителя (нужен для ограничения частоты запросов).
  app.set("trust proxy", 1);
  app.use(
    helmet({
      // Логотипы и файлы отдаются нашему сайту с другого домена.
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.enableCors({
    origin: (origin, cb) => cb(null, !origin || isAllowedOrigin(origin)),
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);
  console.log(`Backend listening on http://localhost:${port}`);
}

bootstrap();
