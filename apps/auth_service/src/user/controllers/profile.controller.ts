import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Req,
  UseGuards, Post,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from '../user.service';
import { UpdateUserDto } from '../dto/updateUser.dto';
import express from 'express';

@Controller('profile')
@UseGuards(AuthGuard('jwt'))
export class ProfileController {
  constructor(private readonly usersService: UserService) {}

  // 🔹 GET MY PROFILE
  @Get()
  async getMyProfile(@Req() req: any) {
    const userId = req.user.userId;
    return this.usersService.findOne(userId);
  }

  // 🔹 UPDATE MY PROFILE
  @Patch()
  async updateMyProfile(
    @Req() req: any,
    @Body() updateUserDto: UpdateUserDto,
  ) {
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
  async changePassword(@Req() req: any, @Body() body: {oldPassword: string, newPassword: string}){
    let userId = req.user.userId;
    return await this.usersService.changePassword(userId, body.oldPassword, body.newPassword);
  }
}
