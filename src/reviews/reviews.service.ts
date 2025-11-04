import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import mongoose from 'mongoose';
import { Company, CompanyDocument } from 'src/companies/schemas/company.schema';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: SoftDeleteModel<ReviewDocument>,
    @InjectModel(Company.name) private companyModel: SoftDeleteModel<CompanyDocument>,
  ) {}

  async create(dto: CreateReviewDto) {
    if (!mongoose.Types.ObjectId.isValid(String(dto.company))) throw new BadRequestException('Invalid company');
    const created = await this.reviewModel.create({ ...dto });
    await this.recomputeCompanyRating(String(dto.company));
    return created;
  }

  async findByCompany(companyId: string) {
    if (!mongoose.Types.ObjectId.isValid(companyId)) throw new BadRequestException('Invalid company');
    return this.reviewModel.find({ company: new mongoose.Types.ObjectId(companyId) }).sort({ createdAt: -1 });
  }

  private async recomputeCompanyRating(companyId: string) {
    const agg = await this.reviewModel.aggregate([
      { $match: { company: new mongoose.Types.ObjectId(companyId) } },
      { $group: { _id: '$company', avg: { $avg: '$rating' }, count: { $count: {} } } }
    ]);
    const avg = agg[0]?.avg ?? 0;
    const count = agg[0]?.count ?? 0;
    await this.companyModel.updateOne({ _id: companyId }, { averageRating: avg, reviewsCount: count });
  }

  async summaryByCompany(companyId: string) {
    if (!mongoose.Types.ObjectId.isValid(companyId)) throw new BadRequestException('Invalid company');
    const pipeline = [
      { $match: { company: new mongoose.Types.ObjectId(companyId) } },
      { $group: { _id: '$rating', count: { $count: {} } } }
    ];
    const dist = await this.reviewModel.aggregate(pipeline);
    const total = dist.reduce((s, d) => s + d.count, 0);
    const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    dist.forEach((d) => { ratingCounts[d._id] = d.count; });
    const avgAgg = await this.reviewModel.aggregate([
      { $match: { company: new mongoose.Types.ObjectId(companyId) } },
      { $group: { _id: null, avg: { $avg: '$rating' } } }
    ]);
    const avg = avgAgg[0]?.avg ?? 0;
    const recommendAgg = await this.reviewModel.countDocuments({ company: new mongoose.Types.ObjectId(companyId), recommend: true });
    const recommendPercent = total ? Math.round((recommendAgg / total) * 100) : 0;
    return { total, average: avg, distribution: ratingCounts, recommendPercent };
  }
}


