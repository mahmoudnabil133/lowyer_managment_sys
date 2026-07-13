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
  Req,
} from '@nestjs/common';
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
import { Model, Types } from 'mongoose';
import { ProviderSchedule, ProviderScheduleDocument } from './models/provider-schedule.schema';
import { AuthGuard } from '@nestjs/passport';
import { Role, Roles, RolesGuard } from '@app/common';
import { EventPattern, Payload } from '@nestjs/microservices';

// ─── Availability ─────────────────────────────────────────────────────────────

@Controller('availability')
@UseGuards(AuthGuard('jwt'))
export class AvailabilityController {
  constructor(private availabilityService: AvailabilityService) { }

  @Get('slots')
  getSlots(@Query() dto: GetAvailableSlotsDto) {
    return this.availabilityService.getAvailableSlots(dto);
  }

  @Get('range')
  getRange(@Query() dto: GetAvailableRangeDto) {
    return this.availabilityService.getAvailabilityRange(dto);
  }

  @Post('hold/:slotId')
  @HttpCode(HttpStatus.OK)
  holdSlot(@Param('slotId') slotId: string, @Req() req: any) {
    const data: HoldSlotDto = { slotId, patientId: req.user.userId };
    return this.availabilityService.holdSlot(data);
  }

  @Post('release-hold/:slotId')
  @HttpCode(HttpStatus.OK)
  releaseHold(@Param('slotId') slotId: string, @Req() req: any) {
    const data: HoldSlotDto = { slotId, patientId: req.user.userId };
    console.log(data);

    return this.availabilityService.releaseSlot(data.slotId, data.patientId);
  }
}

// ─── Appointments ─────────────────────────────────────────────────────────────

@Controller('appointments')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) { }

  @EventPattern('payment.succeeded')
  async handlePaymentSucceeded(@Payload() data: {
    appointmentId: string;
    bookingRef: string;
    paymentId: string;
    amount: number;
  }) {
    console.log('payment.succeeded event calleed');
    await this.appointmentService.fulfillPaidAppointment(data);
  }
  @Post()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  async book(@Body() dto: BookAppointmentDto, @Req() req: any) {
    const patientId = req.user.userId;
    const email = req.user.email;
    return await this.appointmentService.bookAppointment(dto, patientId);
  }

  /**
 * for authenticated users 
 */

  @Get('my-appointments')
  @UseGuards(AuthGuard('jwt'))
  async getMyAppointments(
    @Req() req: any,
    @Query() queryArgs: any, // this capture page, limit, sort, status, date, etc
  ) {
    const userId = req.user.userId;
    const role = req.user.role;
    if (role === Role.USER) {
      console.log(`user req, ${userId}`)
      return await this.appointmentService.getPatientAppointments(userId, queryArgs);
    }
    console.log(`provider req, ${userId}`)
    return await this.appointmentService.getProviderAppointments(userId, queryArgs);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles([Role.ADMIN])
  async getById(@Param('id') id: string) {
    return await this.appointmentService.getAppointmentById(id);
  }

  @Get(':id/history')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles([Role.ADMIN])
  async getHistory(@Param('id') id: string) {
    return await this.appointmentService.getAppointmentHistory(id);
  }



  /**
   * this 2 routes for admin users
   */
  @Get('provider/:providerId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles([Role.ADMIN, Role.PROVIDER])
  getProviderAppointments(
    @Param('providerId') providerId: string,
    @Query() queryArgs: any, // this capture page, limit, sort, status, date, etc
  ) {
    return this.appointmentService.getProviderAppointments(providerId, queryArgs);
  }

  @Get('patient/:patientId')
  @UseGuards(AuthGuard('jwt'))
  getPatientAppointments(
    @Param('patientId') patientId: string,
    @Query() queryArgs: any, // this capture page, limit, sort, status, date, etc
  ) {
    return this.appointmentService.getPatientAppointments(patientId, queryArgs);
  }

  @Post('cancel')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  cancel(@Body() dto: CancelAppointmentDto, @Req() req: any) {
    const role = req.user.role === 'user' ? 'patient' : req.user.role;
    return this.appointmentService.cancelAppointment(dto, req.user.userId, role);
  }

  @Post('reschedule')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles([Role.ADMIN, Role.PROVIDER])

  @HttpCode(HttpStatus.OK)
  reschedule(@Body() dto: RescheduleAppointmentDto, @Req() req: any) {
    const role = req.user.role === 'user' ? 'patient' : req.user.role;
    return this.appointmentService.rescheduleAppointment(dto, req.user.userId, role);
  }

  @Patch('status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles([Role.PROVIDER, Role.ADMIN])
  updateStatus(@Body() dto: UpdateAppointmentStatusDto, @Req() req: any) {
    const role = req.user.role === 'user' ? 'patient' : req.user.role;
    return this.appointmentService.updateStatus(dto, req.user.userId, role);
  }

  @Patch('provider-notes')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles([Role.ADMIN, Role.PROVIDER])
  addNotes(@Body() dto: ProviderNotesDto) {
    return this.appointmentService.addProviderNotes(dto);
  }
}

// ─── Provider Schedule (Admin/Provider) ──────────────────────────────────────

@Controller('schedules')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles([Role.PROVIDER, Role.ADMIN])
export class ScheduleController {
  constructor(
    @InjectModel(ProviderSchedule.name)
    private scheduleModel: Model<ProviderScheduleDocument>,
    private slotGenerator: SlotGeneratorService,
  ) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSchedule(@Body() dto: CreateProviderScheduleDto, @Req() req: any) {
    const providerId = req.user.userId;
    const schedule = await this.scheduleModel.create({ ...dto, providerId });
    // Generate slots for next 30 days immediately
    const { DateTime } = await import('luxon');
    await this.slotGenerator.gerateSlotsForProvider(
      providerId,
      DateTime.utc(),
      DateTime.utc().plus({ days: 30 }),
    );
    return schedule;
  }


  @Get('mySchedule')
  @UseGuards(AuthGuard('jwt')) // Make sure jwt strategy populates req.user
  async getMySchedule(@Req() req: any) {
    const providerId = req.user.userId; // e.g., "64b0f1..."
    console.log(providerId);
    return await this.scheduleModel.findOne({ providerId }).lean();
  }

  @Get(':providerId')
  async getSchedule(@Param('providerId') providerId: string) {
    console.log(providerId);
    return await this.scheduleModel.findOne({ providerId }).lean();
  }




  // get my schedule

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
  // @Roles('admin')
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
