import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './user.schema';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './controllers/admin.controller';
import { ProfileController } from './controllers/profile.controller';
import { ApiModule } from '../common/api-filter/api-filter.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  controllers: [AdminController, ProfileController],
  providers: [UserService],
  exports: [UserService],
  })
export class UserModule {}