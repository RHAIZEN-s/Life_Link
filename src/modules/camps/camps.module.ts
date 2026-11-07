import { Global, Module } from '@nestjs/common';
import { CampsController } from './camps.controller';
import { CampsService } from './camps.service';

@Global()
@Module({
  controllers: [CampsController],
  providers: [CampsService],
  exports: [CampsService],
})
export class CampsModule {}
