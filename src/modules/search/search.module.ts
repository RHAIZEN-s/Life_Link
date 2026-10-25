import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from '../../services/search.service';

@Module({
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
