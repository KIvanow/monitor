import { Module } from '@nestjs/common';
import { DatabaseClientFactory } from './factory/database-client.factory';

@Module({
  providers: [DatabaseClientFactory],
  exports: [DatabaseClientFactory],
})
export class DatabaseModule {}
