// apps/booking_service/src/booking.rpc.controller.ts
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
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
    UpdateProviderScheduleDto
} from '../dtos/booking.dto';
import { AppointmentService } from '../services/appointment.service';
import { AvailabilityService } from '../services/avaiilability.service';
import { SlotGeneratorService } from '../services/slot-generator.service';
import { DateTime } from 'luxon';

@Controller()
export class BookingRpcController {
    constructor(
        private readonly appointmentService: AppointmentService,
        private readonly availabilityService: AvailabilityService,
        private readonly slotGenerator: SlotGeneratorService,
    ) { }

    // Helper method to convert internal exceptions to formatted RpcExceptions
    private handleRpcError(err: any) {
        console.error(`Error in Booking Microservice: ${err.message}`);

        throw new RpcException({
            message: err.message || 'Internal error occurred in booking service',
            statusCode: err.status || err.statusCode || 500,
            name: err.name,
            code: err.code,
            errmsg: err.errmsg
        });
    }

    // Appointments
    @MessagePattern('booking.book')
    async book(@Payload() data: { dto: BookAppointmentDto; patientId: string }) {
        try {
            return await this.appointmentService.bookAppointment(data.dto, data.patientId);
        } catch (err) {
            console.log(err);
            this.handleRpcError(err);
        }
    }

    @MessagePattern('booking.cancel')
    async cancel(@Payload() data: { dto: CancelAppointmentDto; userId: string; role: string }) {
        try {
            return await this.appointmentService.cancelAppointment(data.dto, data.userId, data.role);
        } catch (err) {
            this.handleRpcError(err);
        }
    }

    @MessagePattern('booking.reschedule')
    async reschedule(@Payload() data: { dto: RescheduleAppointmentDto; userId: string; role: string }) {
        try {
            return await this.appointmentService.rescheduleAppointment(data.dto, data.userId, data.role);
        } catch (err) {
            this.handleRpcError(err);
        }
    }

    @MessagePattern('booking.updateStatus')
    async updateStatus(@Payload() data: { dto: UpdateAppointmentStatusDto; userId: string; role: string }) {
        try {
            return await this.appointmentService.updateStatus(data.dto, data.userId, data.role);
        } catch (err) {
            this.handleRpcError(err);
        }
    }

    @MessagePattern('booking.addProviderNotes')
    async addProviderNotes(@Payload() data: { dto: ProviderNotesDto }) {
        try {
            return await this.appointmentService.addProviderNotes(data.dto);
        } catch (err) {
            this.handleRpcError(err);
        }
    }

    @MessagePattern('booking.getAppointment')
    async getAppointment(@Payload() data: { id: string }) {
        try {
            return await this.appointmentService.getAppointmentById(data.id);
        } catch (err) {
            this.handleRpcError(err);
        }
    }

    @MessagePattern('booking.getMyAppointments')
    async getMyAppointments(@Payload() data: { userId: string; role: string; query: any }) {
        try {
            if (data.role === 'patient') {
                return await this.appointmentService.getPatientAppointments(data.userId, data.query);
            } else {
                return await this.appointmentService.getProviderAppointments(data.userId, data.query);
            }
        } catch (err) {
            this.handleRpcError(err);
        }
    }

    @MessagePattern('booking.getAppointmentHistory')
    async getAppointmentHistory(@Payload() data: { id: string }) {
        try {
            return await this.appointmentService.getAppointmentHistory(data.id);
        } catch (err) {
            this.handleRpcError(err);
        }
    }

    // Availability
    @MessagePattern('booking.getAvailableSlots')
    async getAvailableSlots(@Payload() data: GetAvailableSlotsDto) {
        try {
            return await this.availabilityService.getAvailableSlots(data);
        } catch (err) {
            this.handleRpcError(err);
        }
    }

    @MessagePattern('booking.getAvailabilityRange')
    async getAvailabilityRange(@Payload() data: GetAvailableRangeDto) {
        try {
            return await this.availabilityService.getAvailabilityRange(data);
        } catch (err) {
            this.handleRpcError(err);
        }
    }

    @MessagePattern('booking.holdSlot')
    async holdSlot(@Payload() data: HoldSlotDto) {
        try {
            return await this.availabilityService.holdSlot(data);
        } catch (err) {
            this.handleRpcError(err);
        }
    }

    @MessagePattern('booking.releaseSlot')
    async releaseSlot(@Payload() data: { slotId: string; patientId: string }) {
        try {
            return await this.availabilityService.releaseSlot(data.slotId, data.patientId);
        } catch (err) {
            this.handleRpcError(err);
        }
    }

    // create schedule
    @MessagePattern('booking.createSchedule')
    async createSchedule(@Payload() data: { dto: CreateProviderScheduleDto; providerId: string }) {
        try {
            const schedule = await this.availabilityService.scheduleModel.create({
                ...data.dto,
                providerId: data.providerId,
                isActive: true
            });
            await this.slotGenerator.gerateSlotsForProvider(
                data.providerId,
                DateTime.utc(),
                DateTime.utc().plus({ days: 30 }),
            );
            return schedule;
        } catch (err) {
            this.handleRpcError(err);
        }
    }

    @MessagePattern('booking.updateSchedule')
    async updateSchedule(@Payload() data: { providerId: string; dto: UpdateProviderScheduleDto }) {
        try {
            return await this.availabilityService.scheduleModel.findOneAndUpdate(
                { providerId: data.providerId },
                { $set: data.dto },
                { new: true }
            );
        } catch (err) {
            this.handleRpcError(err);
        }
    }

    @MessagePattern('booking.getMySchedule')
    async getMySchedule(@Payload() data: { providerId: string }) {
        try {
            return await this.availabilityService.scheduleModel.findOne({ providerId: data.providerId });
        } catch (err) {
            this.handleRpcError(err);
        }
    }

    @MessagePattern('booking.generateSlots')
    async generateSlots(@Payload() data: { providerId: string; days: number }) {
        try {
            const { DateTime } = await import('luxon');
            return await this.slotGenerator.gerateSlotsForProvider(
                data.providerId,
                DateTime.utc(),
                DateTime.utc().plus({ days: data.days }),
            );
        } catch (err) {
            this.handleRpcError(err);
        }
    }
}