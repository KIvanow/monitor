import { Module } from '@nestjs/common';

// Mock AI module to prevent LanceDB from loading in tests
@Module({})
export class AiModule {}
