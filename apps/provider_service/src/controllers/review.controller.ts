import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReviewService } from '../services/review.service';
import { CreateReviewDto } from '../dtos/review.dto';
import { ValidateObjectIdPipe } from '@app/common';

@Controller('providers')
@UseGuards(AuthGuard('jwt'))
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post(':id/reviews')
  async createReview(
    @Param('id', ValidateObjectIdPipe) id: string,
    @Req() req: any,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewService.create(id, req.user.userId, dto);
  }

  @Get(':id/reviews')
  async getReviews(
    @Param('id', ValidateObjectIdPipe) id: string,
    @Query() query: any,
  ) {
    return this.reviewService.findByProvider(id, query);
  }
}
