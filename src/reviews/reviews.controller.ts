import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ApiTags } from '@nestjs/swagger';
import { Public, ResponseMessage } from 'src/decorator/customize';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @ResponseMessage('Create a new review')
  @Post()
  async create(@Body() dto: CreateReviewDto) {
    return this.reviewsService.create(dto);
  }

  @Public()
  @ResponseMessage('Fetch reviews by company')
  @Get()
  async find(@Query('companyId') companyId: string) {
    return this.reviewsService.findByCompany(companyId);
  }

  @Public()
  @ResponseMessage('Reviews summary by company')
  @Get('summary')
  async summary(@Query('companyId') companyId: string) {
    return this.reviewsService.summaryByCompany(companyId);
  }
}


