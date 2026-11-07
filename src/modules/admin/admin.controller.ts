import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, Roles } from '../auth/decorators';
import type { AuthUser } from '../auth/auth.types';
import { PaginationQueryDto } from '../../common/query.dto';
import { DocumentsService } from '../documents/documents.service';
import {
  DocumentsQueryDto,
  ReviewDocumentDto,
} from '../documents/dto/documents.dto';
import { DonationsService } from '../donations/donations.service';
import { RecordDonationDto } from '../donations/dto/donations.dto';
import { CampsService } from '../camps/camps.service';
import { CreateCampDto, UpdateCampDto } from '../camps/dto/camps.dto';
import { RequestsService } from '../requests/requests.service';
import { DonorRefDto } from '../requests/dto/requests.dto';
import { AppointmentsService } from '../appointments/appointments.service';
import { AppointmentsQueryDto } from '../appointments/appointments.dto';
import {
  AnnouncementsService,
  CreateAnnouncementDto,
} from '../announcements/announcements.module';
import {
  ReportsQueryDto,
  ReportsService,
  ResolveReportDto,
} from '../reports/reports.module';
import { AdminService } from './admin.service';
import {
  AddStaffDto,
  AnalyticsQueryDto,
  AssignAdminDto,
  CreateHospitalDto,
  HospitalRequestsQueryDto,
  ReasonDto,
  SendAlertDto,
  SuperAdminUpdateHospitalDto,
  UpdateHospitalDto,
  UsersQueryDto,
  VerifyUserDto,
} from './dto/admin.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Hospital admins and super admins only.' })
@Roles('hospital_admin', 'super_admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly documents: DocumentsService,
    private readonly donations: DonationsService,
    private readonly camps: CampsService,
    private readonly requests: RequestsService,
    private readonly appointments: AppointmentsService,
    private readonly announcements: AnnouncementsService,
    private readonly reports: ReportsService,
  ) {}

  // --- Overview ---

  @Get('dashboard')
  @ApiOperation({
    summary:
      'Work queues and stats (hospital admins: their hospital; super admins: platform)',
  })
  dashboard(@CurrentUser() user: AuthUser) {
    return this.admin.dashboard(user);
  }

  @Get('analytics')
  @ApiOperation({
    summary:
      'Totals, success rate, blood-group and city supply vs demand, weekly trend',
  })
  analytics(@CurrentUser() user: AuthUser, @Query() query: AnalyticsQueryDto) {
    return this.admin.analytics(user, query);
  }

  // --- Hospital profile ---

  @Get('hospital')
  @ApiOperation({ summary: 'My hospital with staff' })
  hospital(@CurrentUser() user: AuthUser) {
    return this.admin.getHospital(user);
  }

  @Patch('hospital')
  @ApiOperation({ summary: 'Update my hospital details' })
  updateHospital(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateHospitalDto,
  ) {
    return this.admin.updateHospital(user, dto);
  }

  @Post('hospital/staff')
  @ApiOperation({ summary: 'Add a key staff member' })
  addStaff(@CurrentUser() user: AuthUser, @Body() dto: AddStaffDto) {
    return this.admin.addStaff(user, dto);
  }

  @Delete('hospital/staff/:id')
  @ApiOperation({ summary: 'Remove a staff member' })
  removeStaff(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.admin.removeStaff(user, id);
  }

  // --- Requests oversight ---

  @Get('requests')
  @ApiOperation({
    summary:
      'Requests at my hospital (super admin: all); status=active, unverified=true',
  })
  listRequests(
    @CurrentUser() user: AuthUser,
    @Query() query: HospitalRequestsQueryDto,
  ) {
    return this.admin.hospitalRequests(user, query);
  }

  @Post('requests/:id/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Confirm a request is genuine (verified badge)' })
  verifyRequest(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.requests.verify(user, id);
  }

  @Post('requests/:id/flag')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Remove a fake/abusive request (notifies everyone)',
  })
  flagRequest(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReasonDto,
  ) {
    return this.requests.flag(user, id, dto.reason);
  }

  @Post('requests/:id/assign')
  @HttpCode(200)
  @ApiOperation({ summary: 'Manually assign a donor to a request' })
  assignDonor(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DonorRefDto,
  ) {
    return this.requests.assignDonor(user, id, dto.donorId);
  }

  @Post('alerts')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Notify more matching donors about an open request',
  })
  sendAlert(@CurrentUser() user: AuthUser, @Body() dto: SendAlertDto) {
    return this.admin.sendAlert(user, dto);
  }

  // --- Appointments ---

  @Get('appointments')
  @ApiOperation({
    summary: 'Appointments at my hospital (status=requested for slot requests)',
  })
  listAppointments(
    @CurrentUser() user: AuthUser,
    @Query() query: AppointmentsQueryDto,
  ) {
    return this.appointments.listForHospital(user, query);
  }

  // --- User verification & moderation ---

  @Get('users')
  @ApiOperation({
    summary: 'Find users (verificationStatus=pending is the review queue)',
  })
  listUsers(@Query() query: UsersQueryDto) {
    return this.admin.listUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'User profile, health answers and documents' })
  getUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.getUser(id);
  }

  @Patch('users/:id/verification')
  @ApiOperation({ summary: 'Approve or reject a user’s identity verification' })
  verifyUser(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyUserDto,
  ) {
    return this.admin.verifyUser(user, id, dto);
  }

  @Post('users/:id/suspend')
  @HttpCode(200)
  @Roles('super_admin')
  @ApiOperation({
    summary: '[Super admin] Suspend a user (signs them out, closes requests)',
  })
  suspend(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReasonDto,
  ) {
    return this.reports.suspendUser(user, id, dto.reason);
  }

  @Post('users/:id/reinstate')
  @HttpCode(200)
  @Roles('super_admin')
  @ApiOperation({ summary: '[Super admin] Reinstate a suspended user' })
  reinstate(@Param('id', ParseUUIDPipe) id: string) {
    return this.reports.reinstateUser(id);
  }

  @Get('reports')
  @Roles('super_admin')
  @ApiOperation({ summary: '[Super admin] User reports (open first)' })
  listReports(@Query() query: ReportsQueryDto) {
    return this.reports.list(query);
  }

  @Patch('reports/:id')
  @Roles('super_admin')
  @ApiOperation({
    summary:
      '[Super admin] Resolve or dismiss a report, optionally acting on it',
  })
  resolveReport(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveReportDto,
  ) {
    return this.reports.resolve(user, id, dto);
  }

  // --- Document review ---

  @Get('documents')
  @ApiOperation({ summary: 'User documents by review status (pending first)' })
  listDocuments(@Query() query: DocumentsQueryDto) {
    return this.documents.listForReview(
      query.status,
      query.limit,
      query.offset,
    );
  }

  @Patch('documents/:id')
  @ApiOperation({ summary: 'Approve or reject a document' })
  reviewDocument(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewDocumentDto,
  ) {
    return this.documents.review(user, id, dto);
  }

  // --- Donations ---

  @Get('donations/pending')
  @ApiOperation({ summary: 'Self-reported donations awaiting verification' })
  pendingDonations(
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.donations.listPendingForHospital(
      user,
      query.limit,
      query.offset,
    );
  }

  @Post('donations')
  @ApiOperation({ summary: 'Record a verified donation for a donor' })
  recordDonation(
    @CurrentUser() user: AuthUser,
    @Body() dto: RecordDonationDto,
  ) {
    return this.donations.record(user, dto);
  }

  @Post('donations/:id/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify a self-reported donation' })
  verifyDonation(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.donations.verify(user, id);
  }

  // --- Camps ---

  @Get('camps')
  @ApiOperation({ summary: 'Camps with registration counts' })
  listCamps(@CurrentUser() user: AuthUser) {
    return this.camps.listForHospital(user);
  }

  @Post('camps')
  @ApiOperation({ summary: 'Schedule a blood camp (notifies people nearby)' })
  createCamp(@CurrentUser() user: AuthUser, @Body() dto: CreateCampDto) {
    return this.camps.create(user, dto);
  }

  @Patch('camps/:id')
  @ApiOperation({
    summary: 'Update or cancel a camp (cancelling notifies registrants)',
  })
  updateCamp(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampDto,
  ) {
    return this.camps.update(user, id, dto);
  }

  @Get('camps/:id/registrations')
  @ApiOperation({ summary: 'People registered for a camp' })
  campRegistrations(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.camps.registrations(user, id);
  }

  // --- Announcements ---

  @Get('announcements')
  @ApiOperation({ summary: 'Announcements I (or my hospital) published' })
  listAnnouncements(@CurrentUser() user: AuthUser) {
    return this.announcements.listForAdmin(user);
  }

  @Post('announcements')
  @ApiOperation({
    summary: 'Publish an in-app banner, optionally as a notification',
  })
  createAnnouncement(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAnnouncementDto,
  ) {
    return this.announcements.create(user, dto);
  }

  @Delete('announcements/:id')
  @ApiOperation({ summary: 'Take an announcement down' })
  removeAnnouncement(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.announcements.deactivate(user, id);
  }

  // --- Platform (super admin) ---

  @Get('hospitals')
  @Roles('super_admin')
  @ApiOperation({ summary: '[Super admin] List hospitals' })
  listHospitals(@Query() query: PaginationQueryDto) {
    return this.admin.listHospitals(query.limit, query.offset);
  }

  @Post('hospitals')
  @Roles('super_admin')
  @ApiOperation({ summary: '[Super admin] Onboard a partner hospital' })
  createHospital(@Body() dto: CreateHospitalDto) {
    return this.admin.createHospital(dto);
  }

  @Patch('hospitals/:id')
  @Roles('super_admin')
  @ApiOperation({
    summary: '[Super admin] Update a hospital, incl. verification',
  })
  updateAnyHospital(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuperAdminUpdateHospitalDto,
  ) {
    return this.admin.superUpdateHospital(id, dto);
  }

  @Post('hospitals/:id/admins')
  @HttpCode(200)
  @Roles('super_admin')
  @ApiOperation({
    summary: '[Super admin] Make an existing user an admin of this hospital',
  })
  assignAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignAdminDto,
  ) {
    return this.admin.assignHospitalAdmin(id, dto.email);
  }
}
