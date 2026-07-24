import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentService } from './document.service';

@Controller('documents')
@UseGuards(AuthGuard('jwt'))
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(@UploadedFile() file: any, @Body() dto: any, @Req() req: any) {
    return this.documentService.create(req.user.userId, req.user.role, file, {
      ...dto,
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    });
  }

  @Get()
  async list(@Query() query: any) {
    return this.documentService.list(query);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.documentService.getById(id);
  }

  @Get(':id/download')
  async download(@Param('id') id: string) {
    return this.documentService.download(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.documentService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.documentService.delete(id);
  }
}
