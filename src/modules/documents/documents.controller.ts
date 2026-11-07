import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators';
import type { AuthUser } from '../auth/auth.types';
import { DOCUMENT_MAX_BYTES, DOCUMENT_TYPES } from '../../common/constants';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/documents.dto';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'My documents and their review status' })
  list(@CurrentUser() user: AuthUser) {
    return this.documents.listMine(user.id);
  }

  @Post()
  @ApiOperation({
    summary: 'Upload a document for verification (PDF/JPEG/PNG, max 10 MB)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'name', 'docType'],
      properties: {
        file: { type: 'string', format: 'binary' },
        name: { type: 'string', example: 'Aadhaar card' },
        docType: { type: 'string', enum: [...DOCUMENT_TYPES] },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: DOCUMENT_MAX_BYTES, files: 1 },
    }),
  )
  upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadDocumentDto,
  ) {
    return this.documents.upload(user.id, file, dto);
  }

  @Get(':id/url')
  @ApiOperation({ summary: 'Short-lived link to view a document' })
  url(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.documents.fileUrl(user, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a pending or rejected document' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documents.remove(user.id, id);
  }
}
