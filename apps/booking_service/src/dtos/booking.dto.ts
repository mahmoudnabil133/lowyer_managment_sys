import {
  IsString,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  IsMongoId,
  IsDateString,
  Min,
  Max,
  Matches,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AppointmentType } from '../models/appointment.schema';
import { DayOfWeek } from '../models/provider-schedule.schema';
import { PartialType } from '@nestjs/mapped-types';

// ─── Schedule DTOs ─────────────────────────────────────────────────────────────

export class TimeWindowDto {
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be HH:mm',
  })
  startTime: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'endTime must be HH:mm' })
  endTime: string;
}

export class DayScheduleDto {
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @IsBoolean()
  isWorking: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeWindowDto)
  windows: TimeWindowDto[];
}

export class CreateProviderScheduleDto {
  // @IsMongoId()
  // providerId: string;

  @IsNumber()
  @Min(5)
  @Max(240)
  slotDurationMinutes: number;

  @IsNumber()
  @Min(0)
  @Max(60)
  bufferMinutes: number;

  @IsNumber()
  @Min(1)
  @Max(10)
  maxConcurrentAppointments: number;

  @IsNumber()
  @Min(1)
  @Max(365)
  advanceBookingDays: number;

  @IsNumber()
  @Min(0)
  @Max(72)
  minAdvanceBookingHours: number;

  @IsArray()
  @ArrayMinSize(7)
  @ValidateNested({ each: true })
  @Type(() => DayScheduleDto)
  weeklySchedule: DayScheduleDto[];

  @IsArray()
  @IsDateString({}, { each: true })
  @IsOptional()
  blockedDates?: string[];

  @IsString()
  timezone: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateProviderScheduleDto extends PartialType(CreateProviderScheduleDto) { }

// export class UpdateProviderScheduleDto {
//   @IsNumber()
//   @Min(5)
//   @Max(240)
//   @IsOptional()
//   slotDurationMinutes?: number;

//   @IsNumber()
//   @Min(0)
//   @IsOptional()
//   bufferMinutes?: number;

//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => DayScheduleDto)
//   @IsOptional()
//   weeklySchedule?: DayScheduleDto[];

//   @IsArray()
//   @IsDateString({}, { each: true })
//   @IsOptional()
//   blockedDates?: string[];

//   @IsBoolean()
//   @IsOptional()
//   isActive?: boolean;
// }

// ─── Slot DTOs ─────────────────────────────────────────────────────────────────

export class GetAvailableSlotsDto {
  @IsMongoId()
  providerId: string;

  /** "YYYY-MM-DD" */
  @IsDateString()
  date: string;
}

export class GetAvailableRangeDto {
  @IsMongoId()
  providerId: string;

  @IsDateString()
  fromDate: string;

  @IsDateString()
  toDate: string;
}

export class HoldSlotDto {
  @IsMongoId()
  slotId: string;

  @IsMongoId()
  patientId: string;
}

// ─── Appointment DTOs ──────────────────────────────────────────────────────────

// Remove patientId from BookAppointmentDto
export class BookAppointmentDto {
  @IsMongoId()
  slotId: string;

  @IsMongoId()
  providerId: string;

  @IsString()
  patientFullName: string;

  @IsString()
  patientPhone: string;

  @IsString()
  @IsOptional()
  patientEmail?: string;

  @IsDateString()
  @IsOptional()
  patientDateOfBirth?: string;

  @IsEnum(AppointmentType)
  @IsOptional()
  type?: AppointmentType;

  @IsString()
  @IsOptional()
  chiefComplaint?: string;
}

// Remove cancelledByUserId and cancelledByRole
export class CancelAppointmentDto {
  @IsMongoId()
  appointmentId: string;

  @IsString()
  reason: string;
}

// Remove rescheduledByUserId and rescheduledByRole
export class RescheduleAppointmentDto {
  @IsMongoId()
  appointmentId: string;

  @IsMongoId()
  newSlotId: string;
}

// Remove changedByUserId and changedByRole
export class UpdateAppointmentStatusDto {
  @IsMongoId()
  appointmentId: string;

  @IsString()
  toStatus: string;

  @IsString()
  @IsOptional()
  note?: string;
}

export class ProviderNotesDto {
  @IsMongoId()
  appointmentId: string;

  @IsString()
  notes: string;
}
