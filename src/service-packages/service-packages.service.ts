import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateServicePackageDto } from './dto/create-service-package.dto';
import { UpdateServicePackageDto } from './dto/update-service-package.dto';
import { ServicePackage, ServicePackageDocument } from './schemas/service-package.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { IUser } from 'src/users/users.interface';
import aqp from 'api-query-params';
import mongoose from 'mongoose';

@Injectable()
export class ServicePackagesService {
  constructor(
    @InjectModel(ServicePackage.name)
    private servicePackageModel: SoftDeleteModel<ServicePackageDocument>,
  ) {}

  async create(createServicePackageDto: CreateServicePackageDto, user: IUser) {
    const {
      name,
      price,
      maxJobs,
      durationDays,
      isActive = true,
      supportedTags,
    } = createServicePackageDto;

    const normalizedSupportedTags = this.normalizeSupportedTags(
      supportedTags,
      name,
    );

    const servicePackage = await this.servicePackageModel.create({
      name,
      price,
      maxJobs,
      durationDays,
      isActive,
      supportedTags: normalizedSupportedTags,
      createdBy: {
        _id: user._id,
        email: user.email,
      },
    });

    return servicePackage;
  }

  async findAll(currentPage: number, limitPage: number, queryString: string) {
    const { filter, sort, population } = aqp(queryString);
    delete filter.current;
    delete filter.pageSize;

    let offset = (+currentPage - 1) * +limitPage;
    let defaultLimit = +limitPage ? +limitPage : 10;

    const totalItems = (await this.servicePackageModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / defaultLimit);

    const result = await this.servicePackageModel
      .find(filter)
      .skip(offset)
      .limit(defaultLimit)
      // @ts-ignore: Unreachable code error
      .sort(sort)
      .populate(population)
      .exec();

    return {
      meta: {
        current: currentPage,
        pageSize: limitPage,
        pages: totalPages,
        total: totalItems,
      },
      result,
    };
  }

  async findOne(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id))
      throw new BadRequestException(`Gói dịch vụ với id ${id} không hợp lệ`);
    return await this.servicePackageModel.findById(id);
  }

  async update(
    id: string,
    updateServicePackageDto: UpdateServicePackageDto,
    user: IUser,
  ) {
    if (!mongoose.Types.ObjectId.isValid(id))
      throw new BadRequestException(`Gói dịch vụ với id ${id} không hợp lệ`);

    const updateData: any = {
      ...updateServicePackageDto,
      updatedBy: { _id: user._id, email: user.email },
    };

    if (updateServicePackageDto.supportedTags) {
      updateData.supportedTags = this.normalizeSupportedTags(
        updateServicePackageDto.supportedTags,
        updateServicePackageDto.name,
      );
    }

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined && key !== 'updatedBy') {
        delete updateData[key];
      }
    });

    return await this.servicePackageModel.updateOne({ _id: id }, updateData);
  }

  async remove(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id))
      throw new BadRequestException(`Gói dịch vụ với id ${id} không hợp lệ`);

    await this.servicePackageModel.updateOne(
      { _id: id },
      {
        deletedBy: {
          _id: user._id,
          email: user.email,
        },
      },
    );
    return this.servicePackageModel.softDelete({ _id: id });
  }

  async findAllActive() {
    return await this.servicePackageModel.find({ isActive: true, isDeleted: false });
  }

  async findByName(name: string) {
    return await this.servicePackageModel.findOne({ name, isActive: true, isDeleted: false });
  }

  private normalizeSupportedTags(inputTags?: string[], packageName?: string) {
    if (Array.isArray(inputTags) && inputTags.length) {
      const deduped = Array.from(
        new Set(
          inputTags
            .map((tag) => tag?.trim())
            .filter((tag): tag is string => Boolean(tag)),
        ),
      );
      return deduped.length ? deduped : this.deriveSupportedTagsByName(packageName);
    }
    return this.deriveSupportedTagsByName(packageName);
  }

  private deriveSupportedTagsByName(name?: string) {
    const normalized = name?.toLowerCase() || '';
    if (normalized.includes('premium')) {
      return ['New', 'Hot', 'Super Hot'];
    }
    if (normalized.includes('pro')) {
      return ['New', 'Hot'];
    }
    if (normalized.includes('basic')) {
      return ['New'];
    }
    return ['New'];
  }
}

