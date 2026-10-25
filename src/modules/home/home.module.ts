import { Module } from '@nestjs/common';
import { HomeController } from './home.controller';
import { HomeService } from '../../services/home.service';

@Module({
  controllers: [HomeController],
  providers: [HomeService],
  exports: [HomeService],
})
export class HomeModule {}
