import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Query,
  HttpCode,
  HttpStatus,
  Delete,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  BookAppointmentDto,
  CancelAppointmentDto,
  CreateProviderScheduleDto,
  GetAvailableRangeDto,
  GetAvailableSlotsDto,
  ProviderNotesDto,
  RescheduleAppointmentDto,
  UpdateAppointmentStatusDto,
} from '../dots/gateway.dtos';
import { BookingService } from './booking.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthGuard } from '@nestjs/passport';
import type { AuthUserDto } from '../dots/AuthUser.dto';

@Controller()
@UseGuards(AuthGuard('jwt'))
export class BookingController {
  private readonly logger = new Logger(BookingController.name);

  constructor(private readonly bookingService: BookingService) {}

  // ─── Appointments ──────────────────────────────────────────────────────────

  @Post('appointments')
  @Throttle({ default: { limit: 10, ttl: 60 } })
  async book(
    @Body() dto: BookAppointmentDto,
    @CurrentUser() user: AuthUserDto,
  ) {
    this.logger.log(`Booking appointment for user ${user.userId}`);
    return this.bookingService.book(dto, user.userId);
  }

  @Post('appointments/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Body() dto: CancelAppointmentDto,
    @CurrentUser() user: AuthUserDto,
  ) {
    const role = user.role === 'user' ? 'patient' : user.role;
    return this.bookingService.cancel(dto, user.userId, role);
  }

  @Post('appointments/reschedule')
  @HttpCode(HttpStatus.OK)
  async reschedule(
    @Body() dto: RescheduleAppointmentDto,
    @CurrentUser() user: AuthUserDto,
  ) {
    const role = user.role === 'user' ? 'patient' : user.role;
    return this.bookingService.reschedule(dto, user.userId, role);
  }

  @Patch('appointments/status')
  async updateStatus(
    @Body() dto: UpdateAppointmentStatusDto,
    @CurrentUser() user: AuthUserDto,
  ) {
    const role = user.role === 'user' ? 'patient' : user.role;
    return this.bookingService.updateStatus(dto, user.userId, role);
  }

  @Patch('appointments/provider-notes')
  async addProviderNotes(
    @Body() dto: ProviderNotesDto,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.bookingService.addProviderNotes(dto);
  }

  @Get('appointments/my')
  async getMyAppointments(
    @CurrentUser() user: AuthUserDto,
    @Query() query: any,
  ) {
    const role = user.role === 'user' ? 'patient' : 'provider';
    return this.bookingService.getMyAppointments(user.userId, role, query);
  }

  @Get('appointments/:id')
  async getAppointment(@Param('id') id: string) {
    return this.bookingService.getAppointmentById(id);
  }

  @Get('appointments/:id/history')
  async getHistory(@Param('id') id: string) {
    return this.bookingService.getAppointmentHistory(id);
  }

  // ─── Availability ──────────────────────────────────────────────────────────

  @Get('availability/slots')
  async getAvailableSlots(@Query() dto: GetAvailableSlotsDto) {
    return this.bookingService.getAvailableSlots(dto.providerId, dto.date);
  }

  @Get('availability/range')
  async getAvailabilityRange(@Query() dto: GetAvailableRangeDto) {
    return this.bookingService.getAvailabilityRange(
      dto.providerId,
      dto.fromDate,
      dto.toDate,
    );
  }

  @Post('availability/hold/:slotId')
  @HttpCode(HttpStatus.OK)
  async holdSlot(
    @Param('slotId') slotId: string,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.bookingService.holdSlot(slotId, user.userId);
  }

  @Delete('availability/hold/:slotId')
  @HttpCode(HttpStatus.OK)
  async releaseSlot(
    @Param('slotId') slotId: string,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.bookingService.releaseSlot(slotId, user.userId);
  }

  // ─── Schedules ─────────────────────────────────────────────────────────────

  @Post('schedules')
  async createSchedule(
    @Body() dto: CreateProviderScheduleDto,
    @CurrentUser() user: AuthUserDto,
  ) {
    // only provider/admin
    return this.bookingService.createSchedule(dto, user.userId);
  }

  @Get('schedules/my')
  async getMySchedule(@CurrentUser() user: AuthUserDto) {
    return this.bookingService.getMySchedule(user.userId);
  }

  @Get('schedules/:providerId')
  async getSchedule(@Param('providerId') providerId: string) {
    return this.bookingService.getMySchedule(providerId);
  }

  @Patch('schedules/:providerId')
  async updateSchedule(
    @Param('providerId') providerId: string,
    @Body() dto: any,
  ) {
    return this.bookingService.updateSchedule(providerId, dto);
  }

  @Post('schedules/generate-slots')
  async generateSlots(
    @CurrentUser() user: AuthUserDto,
    @Query('days') days = 30,
  ) {
    return this.bookingService.generateSlots(user.userId, days);
  }
}
