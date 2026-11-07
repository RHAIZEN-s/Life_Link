import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { DOCUMENT_TYPES } from '../../../common/constants';
import { PaginationQueryDto } from '../../../common/query.dto';
import { Trim, TrimToNull } from '../../../common/validators';
import type {
  DocumentStatus,
  DocumentType,
} from '../../../types/database.types';

export class UploadDocumentDto {
  @ApiProperty({ example: 'Aadhaar card' })
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: DOCUMENT_TYPES })
  @IsIn(DOCUMENT_TYPES)
  docType: DocumentType;
}

export class ReviewDocumentDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsIn(['approved', 'rejected'])
  status: Exclude<DocumentStatus, 'pending'>;

  @ApiPropertyOptional({ example: 'Image is blurry, please re-upload.' })
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class DocumentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  })
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected'])
  status: DocumentStatus = 'pending';
}
