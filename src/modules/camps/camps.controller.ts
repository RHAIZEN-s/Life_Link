import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators';
import type { AuthUser } from '../auth/auth.types';
import { GeoPaginationQueryDto } from '../../common/query.dto';
import { CampsService } from './camps.service';

@ApiTags('Blood Camps')
@ApiBearerAuth()
@Controller('camps')
export class CampsController {
  constructor(private readonly camps: CampsService) {}

  @Get()
  @ApiOperation({ summary: 'Upcoming camps, soonest first' })
  list(@CurrentUser() user: AuthUser, @Query() query: GeoPaginationQueryDto) {
    return this.camps.listUpcoming(user.id, query);
  }

  @Get('registered')
  @ApiOperation({ summary: 'Camps I registered for' })
  mine(@CurrentUser() user: AuthUser) {
    return this.camps.myRegistrations(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Camp details' })
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.camps.get(user.id, id);
  }

  @Post(':id/registration')
  @ApiOperation({ summary: 'Register for a camp' })
  register(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.camps.register(user.id, id);
  }

  @Delete(':id/registration')
  @ApiOperation({ summary: 'Cancel my registration' })
  unregister(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.camps.unregister(user.id, id);
  }
}
