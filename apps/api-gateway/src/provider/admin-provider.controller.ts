import { Controller, Get, Patch, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles, Role, ValidateObjectIdPipe } from '@app/common';
import { ProviderService } from './provider.service';

@Controller('admin/providers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles([Role.ADMIN])
export class AdminProviderController {
  constructor(private readonly providerService: ProviderService) {}

  @Get('credentials/unverified')
  async listUnverified() {
    return this.providerService.listUnverifiedCredentials();
  }

  @Patch(':id/credentials/:credId/verify')
  async verifyCredential(
    @Param('id', ValidateObjectIdPipe) id: string,
    @Param('credId', ValidateObjectIdPipe) credId: string,
    @Req() req: any,
  ) {
    return this.providerService.verifyCredential(id, credId, req.user.userId);
  }
}
