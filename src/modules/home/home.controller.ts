import { Controller, Get, Query } from '@nestjs/common';
import { HomeService } from '../../services/home.service';
import { GetHomeDto } from './dto/get-home.dto';

@Controller('home')
export class HomeController {
  constructor(private readonly home: HomeService) {}

  @Get()
  async getHomeData(@Query() dto: GetHomeDto) {
    return this.home.getHomeData(dto.email, dto.latitude, dto.longitude, dto.radiusKm);
  }
}
