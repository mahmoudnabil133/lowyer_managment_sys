import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProviderService } from './provider.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { AuthUserDto } from '../dots/AuthUser.dto';
import { RolesGuard, Roles, Role, ValidateObjectIdPipe } from '@app/common';

@Controller('providers')
@UseGuards(AuthGuard('jwt'))
export class ProviderController {
    constructor(private readonly providerService: ProviderService) { }

    @Get()
    @UseGuards(RolesGuard)
    @Roles([Role.ADMIN])
    async getList(@Query() query: any) {
        return this.providerService.getList(query);
    }

    @Get('search')
    async search(@Query() query: any) {
        return this.providerService.search(query);
    }

    @Get(':id')
    async getById(@Param('id', ValidateObjectIdPipe) id: string) {
        return this.providerService.getById(id);
    }

    @Post('me')
    @UseGuards(RolesGuard)
    @Roles([Role.PROVIDER])
    async createMe(@CurrentUser() user: AuthUserDto, @Body() dto: any) {
        return this.providerService.createMe(user.userId, dto);
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles([Role.PROVIDER])
    async update(
        @Param('id', ValidateObjectIdPipe) id: string,
        @CurrentUser() user: AuthUserDto,
        @Body() dto: any,
    ) {
        return this.providerService.update(id, user.userId, dto);
    }

    @Post(':id/reviews')
    async createReview(
        @Param('id', ValidateObjectIdPipe) id: string,
        @CurrentUser() user: AuthUserDto,
        @Body() dto: any,
    ) {
        return this.providerService.createReview(id, user.userId, dto);
    }

    @Get(':id/reviews')
    async getReviews(@Param('id', ValidateObjectIdPipe) id: string, @Query() query: any) {
        return this.providerService.getReviews(id, query);
    }


}
