import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    Query,
    UseGuards,
    Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProfileService } from '../services/profile.service';
import { CreateProfileDto, UpdateProfileDto, SearchProviderDto } from '../dtos/profile.dto';
import { RolesGuard, Roles, ValidateObjectIdPipe } from '@app/common';
import { SearchService } from '../services/search.service';

@Controller('providers')
export class ProfileController {
    constructor(
        private readonly profileService: ProfileService,
        private readonly searchService: SearchService,
    ) { }

    @Get()
    @UseGuards(AuthGuard('jwt'))
    async list(@Query() query: SearchProviderDto) {
        return this.profileService.list(query);
    }

    @Get('me')
    @UseGuards(AuthGuard('jwt'))
    async getMe(@Req() req: any) {
        const profile = await this.profileService.getMe(req.user.userId);
        if (!profile) return { message: 'No profile found. Create one at POST /api/v1/providers/me' };
        return profile;
    }

    @Post('me')
    @UseGuards(AuthGuard('jwt'))
    async createMe(@Req() req: any, @Body() dto: CreateProfileDto) {
        return this.profileService.create(req.user.userId, dto);
    }

    @Patch(':id')
    @UseGuards(AuthGuard('jwt'))
    async update(
        @Param('id', ValidateObjectIdPipe) id: string,
        @Req() req: any,
        @Body() dto: UpdateProfileDto,
    ) {
        return this.profileService.update(id, req.user.userId, dto);
    }

    @Get('search')
    @UseGuards(AuthGuard('jwt'))
    async search(@Query() dto: SearchProviderDto) {
        return this.searchService.search(dto);
    }
}