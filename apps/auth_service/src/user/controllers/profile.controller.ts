import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from '../user.service';
import { UpdateUserDto } from '../dto/updateUser.dto';

@Controller('profile')
@UseGuards(AuthGuard('jwt'))
export class ProfileController {
  private readonly logger = new Logger(ProfileController.name);

  constructor(private readonly usersService: UserService) {}

  // 🔹 GET MY PROFILE
  @Get()
  async getMyProfile(@Req() req: any) {
    this.logger.log(`Profile fetched for user ${req.user?.userId}`);
    const userId = req.user.userId;
    return this.usersService.findOne(userId);
  }
  @Get()
  async test() {
    return 'test';
  }

  // 🔹 UPDATE MY PROFILE
  @Patch()
  async updateMyProfile(@Req() req: any, @Body() updateUserDto: UpdateUserDto) {
    const userId = req.user.userId;
    return this.usersService.updateOne(userId, updateUserDto);
  }

  // 🔹 DELETE MY ACCOUNT
  @Delete()
  async deleteMyAccount(@Req() req: any) {
    const userId = req.user.userId;
    return this.usersService.deleteOne(userId);
  }

  @Post()
  async changePassword(
    @Req() req: any,
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    const userId = req.user.userId;
    return await this.usersService.changePassword(
      userId,
      body.oldPassword,
      body.newPassword,
    );
  }
}
