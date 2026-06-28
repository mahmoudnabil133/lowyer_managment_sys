import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './user.schema';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto/createUser.dto';
import * as bcrypt from 'bcryptjs';
import { UpdateUserDto } from './dto/updateUser.dto';
import { ApiFeatureService, ApiQueryDto, PaginatedResponse } from '@app/common';
@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) { }

  async createUser(createUserDto: CreateUserDto) {
    const isExist = await this.userModel.findOne({
      email: createUserDto.email,
    });
    if (isExist) {
      throw new HttpException('User already exist', HttpStatus.NOT_FOUND);
    }
    let hashed_pass: string = await bcrypt.hash(createUserDto.password, 12);
    const userData = { ...createUserDto, password: hashed_pass } as unknown;
    const user = await this.userModel.create(userData);
    return user;
  }

  async findAllUsers(query: ApiQueryDto): Promise<PaginatedResponse<User>> {
    let results = await new ApiFeatureService<User>(query, this.userModel)
      .filter()
      .sort()
      .select()
      .paginate()
      .execute();
    if (results.data.length <= 0) {
      throw new NotFoundException('Users not found');
    }
    return results;
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.password = undefined;
    return user;
  }

  async updateOne(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(id, updateUserDto, {
      new: true,
      runValidators: true,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async deleteOne(id: string): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndDelete(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async changePassword(id: string, oldPassword: string, newPassword: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!await bcrypt.compare(oldPassword, user.password)) {
      throw new NotFoundException('wrong password');
    }
    user.password = await bcrypt.hash(newPassword, 12);
    user.passwordChangedAt = new Date();
    await user.save();
    return user;
  }

  // helpers to other services

  async findByEmail(email: string): Promise<UserDocument> {
    let user = await this.userModel.findOne({ email: email });
    if (!user) {
      return null;
    }
    return user;
  }
  async saveUser(createUserDto: CreateUserDto): Promise<UserDocument> {
    return await this.userModel.create(createUserDto);
  }

  async findById(id: any): Promise<UserDocument | null> {
    let user = await this.userModel.findById(id);
    if (!user) {
      return null;
    }
    return user;
  }

  async findByEmailverificationCode(
    virificationCode: string,
  ): Promise<UserDocument | null> {
    let user = await this.userModel.findOne({
      virificationCode: virificationCode,
      virificationCodeExpires: { $gt: Date.now() },
    });

    return user || null;
  }

  async findByResetCode(
    resetCode: string,
  ): Promise<UserDocument | null> {
    let user = await this.userModel.findOne({
      passwordResetCode: resetCode,
      passwordResetCodeExpiresIn: { $gt: Date.now() },
    });

    return user;
  }
}