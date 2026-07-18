import { Controller, Get, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles, ValidateObjectIdPipe } from '@app/common';
import { ProfileService } from '../services/profile.service';
import { Role } from '@app/common';

@Controller('admin/providers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles([Role.ADMIN])
export class AdminController {
    constructor(private readonly profileService: ProfileService) { }

    @Get('credentials/unverified')
    async listUnverified() {
        return this.profileService.listUnverifiedCredentials();
    }

    @Patch(':id/credentials/:credId/verify')
    async verifyCredential(
        @Param('id', ValidateObjectIdPipe) id: string,
        @Param('credId', ValidateObjectIdPipe) credId: string,
        @Req() req: any,
    ) {
        return this.profileService.verifyCredential(id, credId, req.user.userId);
    }
}