import './pre-process-envs';

import { startHeartBeat } from '@meta-protocols-oracle/commons';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import assert from 'assert';
import { Response, json, urlencoded } from 'express';
import { Logger } from 'nestjs-pino';
import { patchNestJsSwagger } from 'nestjs-zod';
import process from 'process';
import { AppModule } from './app/app.module';
import {
  MetaIndexerQueryIndexingDTO,
  MetaIndexerQueryToDTO,
} from './app/controllers/meta-indexer.type';
import { AllExceptionsFilter } from './app/interceptors/all-exceptions.filter';
import { env } from './env';

const clientJsonPayloadLimit = '10mb';

function amendActionPath(document: OpenAPIObject) {
  const paths = Object.keys(document.paths);
  for (const p of paths) {
    if (p.indexOf('[:]') < 0) continue;
    const fixedPath = p.split('[:]').join(':');
    const pathDocument = document.paths[p];
    assert(pathDocument, `path ${p} not found`);
    document.paths[fixedPath] = pathDocument;
    delete document.paths[p];
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {});
  const logger = app.get(Logger);
  app.useLogger(logger);

  app.enableCors();
  app.use(json({ limit: clientJsonPayloadLimit }));
  app.use(urlencoded({ limit: clientJsonPayloadLimit, extended: true }));
  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerBuilder = new DocumentBuilder()
    .addBearerAuth()
    .setTitle('ALEX B20 API')
    .setDescription('Alex B20 API service')
    .setVersion('0.0.1')
    .build();
  patchNestJsSwagger();
  const document = SwaggerModule.createDocument(app, swaggerBuilder, {
    extraModels: [MetaIndexerQueryToDTO, MetaIndexerQueryIndexingDTO],
  });
  amendActionPath(document);
  SwaggerModule.setup('swagger-ui', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
  app.getHttpAdapter().get('/swagger-api.json', (_, res: Response) => {
    res.json(document);
  });
  process
    .on('unhandledRejection', reason => {
      const message =
        reason instanceof Error
          ? `${reason.stack ?? reason}`
          : JSON.stringify(reason);
      logger.error(`unhandledRejection: ${message}`);
      process.exit(1);
    })
    .on('uncaughtException', (err, origin) => {
      logger.error(`${origin} ${err.name} ${err.stack}`);
      process.exit(1);
    });

  const port = env().API_PORT;
  await app.listen(port, () => {
    logger.log(`B20 API server started at port ${port}`);
    startHeartBeat(env().HEARTBEAT_URL);
  });
}
bootstrap().catch(e => {
  process.exit(1);
});
