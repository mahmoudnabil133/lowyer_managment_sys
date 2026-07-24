import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class BookingService {
  constructor(@Inject('BOOKING_SERVICE') private client: ClientProxy) {}

  async book(dto: any, patientId: string) {
    return lastValueFrom(this.client.send('booking.book', { dto, patientId }));
  }

  async cancel(dto: any, userId: string, role: string) {
    return lastValueFrom(
      this.client.send('booking.cancel', { dto, userId, role }),
    );
  }

  async reschedule(dto: any, userId: string, role: string) {
    return lastValueFrom(
      this.client.send('booking.reschedule', { dto, userId, role }),
    );
  }

  async updateStatus(dto: any, userId: string, role: string) {
    return lastValueFrom(
      this.client.send('booking.updateStatus', { dto, userId, role }),
    );
  }

  async addProviderNotes(dto: any) {
    return lastValueFrom(this.client.send('booking.addProviderNotes', { dto }));
  }

  async getAppointmentById(id: string) {
    return lastValueFrom(this.client.send('booking.getAppointment', { id }));
  }

  async getMyAppointments(userId: string, role: string, query: any) {
    return lastValueFrom(
      this.client.send('booking.getMyAppointments', { userId, role, query }),
    );
  }

  async getAppointmentHistory(id: string) {
    return lastValueFrom(
      this.client.send('booking.getAppointmentHistory', { id }),
    );
  }

  // Availability operations
  async getAvailableSlots(providerId: string, date: string) {
    return lastValueFrom(
      this.client.send('booking.getAvailableSlots', { providerId, date }),
    );
  }

  async getAvailabilityRange(
    providerId: string,
    fromDate: string,
    toDate: string,
  ) {
    return lastValueFrom(
      this.client.send('booking.getAvailabilityRange', {
        providerId,
        fromDate,
        toDate,
      }),
    );
  }

  async holdSlot(slotId: string, patientId: string) {
    return lastValueFrom(
      this.client.send('booking.holdSlot', { slotId, patientId }),
    );
  }

  async releaseSlot(slotId: string, patientId: string) {
    return lastValueFrom(
      this.client.send('booking.releaseSlot', { slotId, patientId }),
    );
  }

  // Schedule operations
  async createSchedule(dto: any, providerId: string) {
    return lastValueFrom(
      this.client.send('booking.createSchedule', { dto, providerId }),
    );
  }

  async updateSchedule(providerId: string, dto: any) {
    return lastValueFrom(
      this.client.send('booking.updateSchedule', { providerId, dto }),
    );
  }

  async getMySchedule(providerId: string) {
    return lastValueFrom(
      this.client.send('booking.getMySchedule', { providerId }),
    );
  }

  async generateSlots(providerId: string, days: number) {
    return lastValueFrom(
      this.client.send('booking.generateSlots', { providerId, days }),
    );
  }
}
