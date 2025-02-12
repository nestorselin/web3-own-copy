import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { NestExpressApplication } from "@nestjs/platform-express";
import * as fs from "fs";

async function bootstrap() {
  const isDevelopment = process.env.NODE_ENV === "development";

  const httpsOptions = !isDevelopment
    ? {
        key: fs.readFileSync("/etc/ssl/private.key"),
        cert: fs.readFileSync("/etc/ssl/certificate.crt"),
      }
    : undefined;

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    httpsOptions,
  });

  app.enableCors();
  app.set("trust proxy", 1);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  const port = process.env.PORT || 3005;
  await app.listen(port);

  console.log(`App successfully started on port ${port}!`);
}

bootstrap();
