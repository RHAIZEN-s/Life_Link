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
import { AppointmentsService } from '../appointments/appointments.service';
import { RequestsService } from './requests.service';
import {
  CreateRequestDto,
  DonorRefDto,
  ListRequestsQueryDto,
  MyRequestsQueryDto,
  MyResponsesQueryDto,
  RateDto,
  RespondDto,
  ScheduleAppointmentDto,
  UpdateRequestStatusDto,
} from './dto/requests.dto';

@ApiTags('Requests')
@ApiBearerAuth()
@Controller('requests')
export class RequestsController {
  constructor(
    private readonly requests: RequestsService,
    private readonly appointments: AppointmentsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Active requests from others',
    description:
      'Ordered by priority, compatibility with my blood group, distance (when lat/lng given), then newest. ' +
      'compatibleOnly=true limits to requests I can donate to.',
  })
  list(@CurrentUser() user: AuthUser, @Query() query: ListRequestsQueryDto) {
    return this.requests.listOpen(user, query);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Requests I created (status=active for open ones)' })
  mine(@CurrentUser() user: AuthUser, @Query() query: MyRequestsQueryDto) {
    return this.requests.listMine(user.id, query);
  }

  @Get('responses/mine')
  @ApiOperation({ summary: 'Requests I accepted or declined (history)' })
  myResponses(
    @CurrentUser() user: AuthUser,
    @Query() query: MyResponsesQueryDto,
  ) {
    return this.requests.myResponses(user.id, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Request details',
    description:
      'Coordinators (requester / hospital) also get accepted donors with contact details, appointments and the status timeline.',
  })
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.requests.get(user, id);
  }

  @Get(':id/matches')
  @ApiOperation({
    summary: 'Best-matching compatible donors nearby (coordinators only)',
  })
  matches(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.requests.matches(user, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a blood or organ request; alerts matching donors',
  })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRequestDto) {
    return this.requests.create(user, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Mark a request completed or cancel it' })
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRequestStatusDto,
  ) {
    return this.requests.updateStatus(user, id, dto.status, dto.reason);
  }

  @Post(':id/responses')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Accept or decline a request',
    description:
      'Accepting requires a verified identity, a compatible blood group and (for blood) being past the recovery period.',
  })
  respond(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RespondDto,
  ) {
    return this.requests.respond(user, id, dto);
  }

  @Post(':id/invite')
  @HttpCode(200)
  @ApiOperation({ summary: 'Personally notify one matching donor' })
  invite(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DonorRefDto,
  ) {
    return this.requests.invite(user, id, dto.donorId);
  }

  @Post(':id/appointments')
  @ApiOperation({
    summary: 'Schedule a donation with a donor who accepted',
  })
  schedule(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScheduleAppointmentDto,
  ) {
    return this.appointments.scheduleForRequest(user, id, dto);
  }

  @Post(':id/ratings')
  @ApiOperation({
    summary: 'Rate a donor or the hospital after the request is completed',
  })
  rate(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RateDto,
  ) {
    return this.requests.rate(user, id, dto);
  }
}
