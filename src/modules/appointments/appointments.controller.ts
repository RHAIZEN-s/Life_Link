import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators';
import type { AuthUser } from '../auth/auth.types';
import { AppointmentsService } from './appointments.service';
import {
  AppointmentsQueryDto,
  BookAppointmentDto,
  CancelAppointmentDto,
  CompleteAppointmentDto,
  UpdateAppointmentDto,
} from './appointments.dto';

@ApiTags('Appointments')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Post()
  @ApiOperation({
    summary: 'Book a donation slot at a hospital (the hospital confirms it)',
  })
  book(@CurrentUser() user: AuthUser, @Body() dto: BookAppointmentDto) {
    return this.appointments.book(user, dto);
  }

  @Get('mine')
  @ApiOperation({
    summary: 'My appointments (status=upcoming for active ones)',
  })
  mine(@CurrentUser() user: AuthUser, @Query() query: AppointmentsQueryDto) {
    return this.appointments.listMine(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Appointment details (donor or coordinators)' })
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.appointments.get(user, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Confirm a requested slot, reschedule, or update details',
  })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointments.update(user, id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel (donor or coordinator)' })
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelAppointmentDto,
  ) {
    return this.appointments.cancel(user, id, dto.reason ?? null);
  }

  @Post(':id/complete')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Mark donated: records the donation and may complete the request',
  })
  complete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteAppointmentDto,
  ) {
    return this.appointments.complete(user, id, dto);
  }

  @Post(':id/no-show')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark that the donor did not attend' })
  noShow(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.appointments.noShow(user, id);
  }
}
