declare module 'helmet' {
  import { NestExpressApplication } from '@nestjs/platform-express';
  function helmet(options?: any): any;
  export = helmet;
}
