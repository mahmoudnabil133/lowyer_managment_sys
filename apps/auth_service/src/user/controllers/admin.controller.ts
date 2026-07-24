import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
// import { RolesGuard } from '../../auth/Roles/roles.guard';
import { UserService } from '../user.service';
import { CreateUserDto } from '../dto/createUser.dto';
import { UpdateUserDto } from '../dto/updateUser.dto';
// import { Role } from '../../common/types/roles.enum';
// import { Roles } from '../../common/decorators/roles.decorator';
import { ApiQueryDto } from '../../../../../libs/common/src/global/dto/api-query.dto';
import { ValidateObjectIdPipe } from '../../../../../libs/common/src/global/pipes/validateObjectId.pipe';
import { Role, Roles, RolesGuard } from '@app/common';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles([Role.ADMIN])
export class AdminController {
  constructor(private readonly usersService: UserService) {}

  // 🔹 CREATE USER
  @Post()
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

  // 🔹 GET ALL USERS
  @Get()
  async getAllUsers(@Query() query: ApiQueryDto) {
    return this.usersService.findAllUsers(query);
  }

  // 🔹 GET ONE USER
  @Get(':id')
  async getUser(@Param('id', ValidateObjectIdPipe) id: string) {
    return this.usersService.findOne(id);
  }

  // 🔹 UPDATE USER
  @Patch(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateOne(id, updateUserDto);
  }

  // 🔹 DELETE USER
  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    return this.usersService.deleteOne(id);
  }
}
