import { Module } from '@nestjs/common';
import { DatabaseClientFactory } from './factory/database-client.factory';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [
    DatabaseClientFactory,
    {
      provide: 'DATABASE_CLIENT',
      useFactory: async (factory: DatabaseClientFactory) => {
        const client = await factory.create();
        await client.connect();
        return client;
      },
      inject: [DatabaseClientFactory],
    },
  ],
  exports: ['DATABASE_CLIENT'],
})
export class DatabaseModule {}
