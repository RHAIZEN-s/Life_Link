import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators';
import type { AuthUser } from '../auth/auth.types';
import { PaginationQueryDto } from '../../common/query.dto';
import { DonationsService } from './donations.service';
import { CreateDonationDto } from './dto/donations.dto';

@ApiTags('Donations')
@ApiBearerAuth()
@Controller('donations')
export class DonationsController {
  constructor(private readonly donations: DonationsService) {}

  @Get()
  @ApiOperation({ summary: 'My donation history with eligibility and points' })
  list(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.donations.listMine(user.id, query.limit, query.offset);
  }

  @Post()
  @ApiOperation({
    summary: 'Log a past donation (unverified until the hospital confirms)',
  })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDonationDto) {
    return this.donations.create(user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an unverified donation I logged' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.donations.remove(user.id, id);
  }

  @Get(':id/certificate')
  @ApiProduces('application/pdf')
  @ApiOperation({
    summary: 'Download the PDF certificate for a verified donation',
  })
  async certificate(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const { pdf, fileName } = await this.donations.certificate(user.id, id);
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
      length: pdf.length,
    });
  }
}
