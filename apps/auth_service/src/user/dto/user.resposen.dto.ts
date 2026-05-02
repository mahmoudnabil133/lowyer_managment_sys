import { Exclude } from 'class-transformer';

export class UserResponseDto {
  id: string;
  email: string;

  @Exclude()
  password: string;
}
