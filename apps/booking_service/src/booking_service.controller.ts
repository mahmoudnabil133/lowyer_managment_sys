import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { AppointmentService } from './services/appointment.service';
import { AvailabilityService } from './services/avaiilability.service';
import { SlotGeneratorService } from './services/slot-generator.service';
import {
  BookAppointmentDto,
  CancelAppointmentDto,
  RescheduleAppointmentDto,
  UpdateAppointmentStatusDto,
  ProviderNotesDto,
  GetAvailableSlotsDto,
  GetAvailableRangeDto,
  HoldSlotDto,
  CreateProviderScheduleDto,
  UpdateProviderScheduleDto,
} from './dtos/booking.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProviderSchedule, ProviderScheduleDocument } from './models/provider-schedule.schema';

// ─── Availability ─────────────────────────────────────────────────────────────

@Controller('availability')
@UseGuards(JwtAuthGuard)
export class AvailabilityController {
  constructor(private availabilityService: AvailabilityService) {}

  @Get('slots')
  getSlots(@Query() dto: GetAvailableSlotsDto) {
    return this.availabilityService.getAvailableSlots(dto);
  }

  @Get('range')
  getRange(@Query() dto: GetAvailableRangeDto) {
    return this.availabilityService.getAvailabilityRange(dto);
  }

  @Post('hold')
  @HttpCode(HttpStatus.OK)
  holdSlot(@Body() dto: HoldSlotDto) {
    return this.availabilityService.holdSlot(dto);
  }

  @Post('release-hold')
  @HttpCode(HttpStatus.OK)
  releaseHold(@Body() dto: { slotId: string; patientId: string }) {
    return this.availabilityService.releaseHold(dto.slotId, dto.patientId);
  }
}

// ─── Appointments ─────────────────────────────────────────────────────────────

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentController {
  constructor(private appointmentService: AppointmentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  book(@Body() dto: BookAppointmentDto) {
    return this.appointmentService.bookAppointment(dto);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.appointmentService.getAppointmentById(id);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.appointmentService.getAppointmentHistory(id);
  }

  @Get('provider/:providerId')
  @Roles('provider', 'admin')
  @UseGuards(RolesGuard)
  getProviderAppointments(
    @Param('providerId') providerId: string,
    @Query('date') date: string,
    @Query('status') status?: string,
  ) {
    return this.appointmentService.getProviderAppointments(providerId, date, status as any);
  }

  @Get('patient/:patientId')
  getPatientAppointments(
    @Param('patientId') patientId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: string,
  ) {
    return this.appointmentService.getPatientAppointments(patientId, +page, +limit, status as any);
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Body() dto: CancelAppointmentDto) {
    return this.appointmentService.cancelAppointment(dto);
  }

  @Post('reschedule')
  @HttpCode(HttpStatus.OK)
  reschedule(@Body() dto: RescheduleAppointmentDto) {
    return this.appointmentService.rescheduleAppointment(dto);
  }

  @Patch('status')
  @Roles('provider', 'admin')
  @UseGuards(RolesGuard)
  updateStatus(@Body() dto: UpdateAppointmentStatusDto) {
    return this.appointmentService.updateStatus(dto);
  }

  @Patch('provider-notes')
  @Roles('provider', 'admin')
  @UseGuards(RolesGuard)
  addNotes(@Body() dto: ProviderNotesDto) {
    return this.appointmentService.addProviderNotes(dto);
  }
}

// ─── Provider Schedule (Admin/Provider) ──────────────────────────────────────

@Controller('schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('provider', 'admin')
export class ScheduleController {
  constructor(
    @InjectModel(ProviderSchedule.name)
    private scheduleModel: Model<ProviderScheduleDocument>,
    private slotGenerator: SlotGeneratorService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSchedule(@Body() dto: CreateProviderScheduleDto) {
    const schedule = await this.scheduleModel.create(dto);
    // Generate slots for next 30 days immediately
    const { DateTime } = await import('luxon');
    await this.slotGenerator.gerateSlotsForProvider(
      dto.providerId,
      DateTime.utc(),
      DateTime.utc().plus({ days: 30 }),
    );
    return schedule;
  }

  @Get(':providerId')
  getSchedule(@Param('providerId') providerId: string) {
    return this.scheduleModel.findOne({ providerId }).lean();
  }

  @Patch(':providerId')
  async updateSchedule(
    @Param('providerId') providerId: string,
    @Body() dto: UpdateProviderScheduleDto,
  ) {
    const schedule = await this.scheduleModel.findOneAndUpdate(
      { providerId },
      { $set: dto },
      { new: true },
    );
    // Regenerate upcoming slots
    const { DateTime } = await import('luxon');
    await this.slotGenerator.gerateSlotsForProvider(
      providerId,
      DateTime.utc().plus({ days: 1 }),
      DateTime.utc().plus({ days: 30 }),
    );
    return schedule;
  }

  @Post(':providerId/generate-slots')
  @Roles('admin')
  async generateSlots(
    @Param('providerId') providerId: string,
    @Query('days') days = 30,
  ) {
    const { DateTime } = await import('luxon');
    return this.slotGenerator.gerateSlotsForProvider(
      providerId,
      DateTime.utc(),
      DateTime.utc().plus({ days: +days }),
    );
  }
}
