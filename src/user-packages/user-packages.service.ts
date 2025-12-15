import { BadRequestException, Injectable } from '@nestjs/common';
import { UserPackage, UserPackageDocument } from './schemas/user-package.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { ServicePackage, ServicePackageDocument } from '../service-packages/schemas/service-package.schema';
import mongoose from 'mongoose';
import { normalizeJobTag } from 'src/common/constants/job-tags.constant';

@Injectable()
export class UserPackagesService {
  constructor(
    @InjectModel(UserPackage.name)
    private userPackageModel: SoftDeleteModel<UserPackageDocument>,
    @InjectModel(ServicePackage.name)
    private servicePackageModel: SoftDeleteModel<ServicePackageDocument>,
  ) {}

  // Tạo gói mặc định cho user (tạm thời chưa có chức năng mua)
  async createDefaultPackage(userId: string, packageName: string = 'Basic') {
    const servicePackage = await this.servicePackageModel.findOne({
      name: packageName,
      isActive: true,
      isDeleted: false,
    });

    if (!servicePackage) {
      throw new BadRequestException(`Không tìm thấy gói dịch vụ ${packageName}`);
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + servicePackage.durationDays);

    // Kiểm tra xem user đã có gói active chưa (chưa hết hạn)
    const existingPackage = await this.userPackageModel.findOne({
      userId: new mongoose.Types.ObjectId(userId as any),
      isActive: true,
      isDeleted: false,
      endDate: { $gte: new Date() },
    });

    if (existingPackage) {
      return existingPackage;
    }

    // Nếu có gói cũ đã hết hạn, đánh dấu không active
    await this.userPackageModel.updateMany(
      {
        userId: new mongoose.Types.ObjectId(userId as any),
        isActive: true,
        isDeleted: false,
        endDate: { $lt: new Date() },
      },
      {
        isActive: false,
      },
    );

    // Tạo gói mới với usedJobs = 0
    const userPackage = await this.userPackageModel.create({
      userId: new mongoose.Types.ObjectId(userId as any),
      packageId: servicePackage._id,
      startDate,
      endDate,
      usedJobs: 0, // Reset về 0 khi tạo gói mới
      isActive: true,
      createdBy: {
        _id: new mongoose.Types.ObjectId(userId as any),
        email: '',
      },
    });

    return userPackage.populate('packageId');
  }

  // Lấy gói active của user theo thứ tự ưu tiên
  async getActivePackage(userId: string) {
    const prioritizedPackages = await this.getActivePackagesSorted(userId);

    if (!prioritizedPackages.length) {
      return await this.createDefaultPackage(userId, 'Basic');
    }

    // Ưu tiên gói còn lượt sử dụng, nếu không có thì trả về gói đầu tiên theo thứ tự ưu tiên
    const packageWithQuota = prioritizedPackages.find((pkg) => this.hasRemainingJobs(pkg));
    return packageWithQuota ?? prioritizedPackages[0];
  }

  // Kiểm tra user có thể đăng job không
  async canPostJob(
    userId: string,
    options?: {
      desiredTag?: string | null;
      userPackageId?: string | null;
      requireRemainingJobs?: boolean;
    },
  ): Promise<{
    canPost: boolean;
    message?: string;
    package?: any;
    userPackageId?: string;
  }> {
    const desiredTag = options?.desiredTag;
    const userPackageId = options?.userPackageId;
    const requireRemainingJobs = options?.requireRemainingJobs !== false;
    const prioritizedPackages = await this.getActivePackagesSorted(userId);
    if (!prioritizedPackages.length) {
      return {
        canPost: false,
        message: 'Bạn chưa sở hữu gói dịch vụ nào. Vui lòng mua gói đăng tin để tiếp tục.',
      };
    }

    const now = new Date();
    const packagesSupportTag = prioritizedPackages.filter((pkg) => this.supportsTag(pkg, desiredTag));

    if (!packagesSupportTag.length) {
      const tagLabel = desiredTag ? `"${desiredTag}"` : 'theo yêu cầu';
      return {
        canPost: false,
        message: `Không có gói dịch vụ nào hỗ trợ tag ${tagLabel}. Vui lòng nâng cấp hoặc mua gói phù hợp.`,
      };
    }

    const tagLabel = desiredTag ? `"${desiredTag}"` : 'theo yêu cầu';
    let candidatePackages = packagesSupportTag;

    if (requireRemainingJobs) {
      candidatePackages = packagesSupportTag.filter((pkg) => this.hasRemainingJobs(pkg));
      if (!candidatePackages.length) {
        const firstPackage = packagesSupportTag[0];
        const pkgData = firstPackage.packageId as any;
        const remainingDays = Math.max(
          Math.ceil((firstPackage.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
          0,
        );
        return {
          canPost: false,
          message: `Các gói hỗ trợ tag ${tagLabel} đã hết lượt đăng. Gói ưu tiên (${pkgData?.name}) vẫn còn ${remainingDays} ngày hiệu lực nhưng không còn slot. Vui lòng mua thêm gói.`,
        };
      }
    }

    let targetPackage = candidatePackages[0];

    if (userPackageId) {
      targetPackage = candidatePackages.find((pkg) => pkg._id?.toString() === userPackageId) ?? null;
      if (!targetPackage) {
        return {
          canPost: false,
          message: `Gói được chọn không hỗ trợ tag ${tagLabel}${requireRemainingJobs ? ' hoặc đã hết lượt đăng' : ''}.`,
        };
      }
    }

    return {
      canPost: true,
      package: targetPackage,
      userPackageId: targetPackage?._id?.toString(),
    };
  }

  // Tăng số lượng job đã sử dụng
  async incrementJobUsage(userId: string, userPackageId?: string) {
    let targetPackageId = userPackageId;

    if (!targetPackageId) {
      const eligiblePackages = await this.getEligiblePackagesSorted(userId);
      targetPackageId = eligiblePackages[0]?._id?.toString();
    }

    if (!targetPackageId) {
      throw new BadRequestException('Không tìm thấy gói dịch vụ đang hoạt động để cập nhật số job.');
    }

    const updatedPackage = await this.userPackageModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(targetPackageId),
        userId: new mongoose.Types.ObjectId(userId as any),
        isActive: true,
        isDeleted: false,
      },
      {
        $inc: {
          usedJobs: 1,
        },
      },
      { new: true },
    );

    if (!updatedPackage) {
      throw new BadRequestException('Không thể cập nhật số job đã sử dụng. Vui lòng thử lại.');
    }

    return updatedPackage;
  }

  /**
   * Lấy overview: danh sách gói còn slot (ưu tiên) và lịch sử gói đã mua
   */
  async getPackagesOverview(userId: string) {
    const now = new Date();
    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    let packages = await this.userPackageModel
      .find({
        userId: new mongoose.Types.ObjectId(userId as any),
        isDeleted: false,
      })
      .populate('packageId')
      .exec();

    if (!packages.length) {
      const defaultPackage = await this.createDefaultPackage(userId, 'Basic');
      packages = [await defaultPackage.populate('packageId')];
    }

    const availablePackages = packages.filter((pkg) => this.isPackageAvailable(pkg, now));
    const prioritizedAvailable = this.sortPackagesByPriority(availablePackages, now).map((pkg, index) => {
      const stats = this.buildPackageStats(pkg, now, MS_PER_DAY);
      return {
        ...pkg.toObject(),
        priority: index + 1,
        stats,
      };
    });

    const historyPackages = packages
      .filter((pkg) => !this.isPackageAvailable(pkg, now))
      .map((pkg) => ({
        ...pkg.toObject(),
        stats: this.buildPackageStats(pkg, now, MS_PER_DAY),
      }))
      .sort((a, b) => {
        const endA = new Date(a.endDate).getTime();
        const endB = new Date(b.endDate).getTime();
        return endB - endA;
      });

    return {
      active: prioritizedAvailable,
      history: historyPackages,
    };
  }

  /**
   * Lấy danh sách gói đang hoạt động (chưa hết hạn) và sắp xếp theo thứ tự ưu tiên
   */
  private async getActivePackagesSorted(userId: string) {
    const now = new Date();
    const packages = await this.userPackageModel
      .find({
        userId: new mongoose.Types.ObjectId(userId as any),
        isActive: true,
        isDeleted: false,
        endDate: { $gte: now },
      })
      .populate('packageId')
      .exec();

    if (!packages.length) {
      const defaultPackage = await this.createDefaultPackage(userId, 'Basic');
      return [defaultPackage];
    }

    return this.sortPackagesByPriority(packages, now);
  }

  /**
   * Lọc ra các gói còn lượt đăng và trả về theo thứ tự ưu tiên
   */
  private async getEligiblePackagesSorted(userId: string, desiredTag?: string | null) {
    const prioritized = await this.getActivePackagesSorted(userId);
    return prioritized.filter(
      (pkg) => this.hasRemainingJobs(pkg) && this.supportsTag(pkg, desiredTag),
    );
  }

  private isPackageAvailable(userPackage: UserPackageDocument, now: Date) {
    return (
      userPackage.isActive &&
      userPackage.endDate >= now &&
      this.hasRemainingJobs(userPackage)
    );
  }

  private hasRemainingJobs(userPackage: UserPackageDocument) {
    const packageData = userPackage.packageId as any;
    if (!packageData) return false;
    const maxJobs = packageData.maxJobs ?? 0;
    if (maxJobs <= 0) {
      return true;
    }
    return (userPackage.usedJobs ?? 0) < maxJobs;
  }

  private sortPackagesByPriority(packages: UserPackageDocument[], now: Date) {
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    return [...packages].sort((a, b) => {
      const endDiff = a.endDate.getTime() - b.endDate.getTime();
      if (endDiff !== 0) return endDiff;

      const statsA = this.buildPackageStats(a, now, MS_PER_DAY);
      const statsB = this.buildPackageStats(b, now, MS_PER_DAY);

      const remainingJobsDiff = statsB.remainingJobs - statsA.remainingJobs;
      if (remainingJobsDiff !== 0) return remainingJobsDiff;

      const remainingDaysDiff = statsB.remainingDays - statsA.remainingDays;
      if (remainingDaysDiff !== 0) return remainingDaysDiff;

      const priceDiff = statsA.price - statsB.price;
      if (priceDiff !== 0) return priceDiff;

      return (a.createdAt?.getTime?.() || 0) - (b.createdAt?.getTime?.() || 0);
    });
  }

  private buildPackageStats(userPackage: UserPackageDocument, now: Date, MS_PER_DAY: number) {
    const packageData = userPackage.packageId as any;
    const maxJobs = packageData?.maxJobs ?? 0;
    const price = packageData?.price ?? Number.MAX_SAFE_INTEGER;
    const remainingJobs = Math.max(maxJobs - (userPackage.usedJobs ?? 0), 0);
    const remainingDays = Math.max(Math.ceil((userPackage.endDate.getTime() - now.getTime()) / MS_PER_DAY), 0);
    return {
      remainingJobs,
      remainingDays,
      price,
      maxJobs,
      supportedTags: this.getSupportedTagsFromPackage(packageData),
    };
  }

  private supportsTag(userPackage: UserPackageDocument, desiredTag?: string | null) {
    if (!desiredTag) return true;
    const normalizedDesired = normalizeJobTag(desiredTag);
    if (!normalizedDesired) return true;
    const packageData = userPackage.packageId as any;
    const supportedTags = this.getSupportedTagsFromPackage(packageData)
      .map((tag) => normalizeJobTag(tag))
      .filter((tag): tag is string => Boolean(tag));
    return supportedTags.includes(normalizedDesired);
  }

  private getSupportedTagsFromPackage(packageData: any) {
    if (Array.isArray(packageData?.supportedTags) && packageData.supportedTags.length) {
      return packageData.supportedTags;
    }
    return this.deriveSupportedTagsByName(packageData?.name);
  }

  private deriveSupportedTagsByName(name?: string) {
    const normalized = name?.toLowerCase() || '';
    if (normalized.includes('premium')) {
      return ['New', 'Hot', 'Super Hot'];
    }
    if (normalized.includes('pro')) {
      return ['New', 'Hot'];
    }
    return ['New'];
  }
}

