import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { memoryStorage } from 'multer';

import { CommitReviewInput } from '@marginmitra/shared';

import { AppAuthGuard } from '../auth/guards/app-auth.guard';
import { CommitReviewDto, DraftLookupParamsDto } from './dto/commit-review.dto';
import { UploadIngestionDto } from './dto/upload-ingestion.dto';
import { IngestionService } from './ingestion.service';

@Controller('ingestion')
@UseGuards(AppAuthGuard)
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024
      }
    })
  )
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadIngestionDto,
    @Res({ passthrough: true }) response: Response
  ) {
    if (!file) {
      response.status(HttpStatus.BAD_REQUEST);
      return {
        status: 'ERROR',
        message: 'A CSV file is required.'
      };
    }

    const draft = this.ingestionService.uploadCsv(file.buffer, dto.platform);

    if (draft.status === 'REQUIRES_REVIEW') {
      response.status(HttpStatus.PARTIAL_CONTENT);
    }

    return draft;
  }

  @Get('review/:draftId')
  getDraft(@Param() params: DraftLookupParamsDto) {
    return this.ingestionService.getDraft(params.draftId);
  }

  @Post('commit')
  commit(@Body() dto: CommitReviewDto) {
    const input: CommitReviewInput = {
      draftId: dto.draftId,
      corrections: dto.corrections
    };

    return this.ingestionService.commit(input);
  }
}

