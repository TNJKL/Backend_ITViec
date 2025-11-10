import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { User, UserDocument } from 'src/users/schemas/user.schema';
import { Role, RoleDocument } from 'src/roles/schemas/role.schema';
import { Job, JobDocument } from 'src/jobs/schemas/job.schema';
import { Resume, ResumeDocument } from 'src/resumes/schemas/resume.schema';
import { Company, CompanyDocument } from 'src/companies/schemas/company.schema';

interface RoleCount {
  roleId?: string;
  roleName?: string;
  count: number;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(User.name) private readonly userModel: SoftDeleteModel<UserDocument>,
    @InjectModel(Role.name) private readonly roleModel: SoftDeleteModel<RoleDocument>,
    @InjectModel(Job.name) private readonly jobModel: SoftDeleteModel<JobDocument>,
    @InjectModel(Resume.name) private readonly resumeModel: SoftDeleteModel<ResumeDocument>,
    @InjectModel(Company.name) private readonly companyModel: SoftDeleteModel<CompanyDocument>,
  ) {}

  private notDeletedCondition() {
    return {
      $or: [
        { isDeleted: { $exists: false } },
        { isDeleted: false },
        { isDeleted: null },
      ],
    };
  }

  private withNotDeleted(additional?: Record<string, any>) {
    const base = this.notDeletedCondition();
    if (!additional || Object.keys(additional).length === 0) {
      return base;
    }
    return { $and: [base, additional] };
  }

  private extractRoleCounts(raw: RoleCount[]) {
    const summary = {
      total: 0,
      candidate: 0,
      hr: 0,
      admin: 0,
      others: [] as RoleCount[],
    };
    raw.forEach((item) => {
      summary.total += item.count;
      const roleName = (item.roleName || '').toUpperCase();
      if (roleName === 'NORMAL_USER' || roleName === 'CANDIDATE') {
        summary.candidate += item.count;
      } else if (roleName === 'HR' || roleName === 'RECRUITER') {
        summary.hr += item.count;
      } else if (roleName === 'ADMIN' || roleName === 'SUPER_ADMIN') {
        summary.admin += item.count;
      } else {
        summary.others.push(item);
      }
    });
    return summary;
  }

  private async getRoleCounts() {
    const pipeline = [
      { $match: this.notDeletedCondition() },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: this.roleModel.collection.name,
          localField: '_id',
          foreignField: '_id',
          as: 'role',
        },
      },
      {
        $unwind: {
          path: '$role',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          roleId: { $toString: '$_id' },
          roleName: '$role.name',
          count: 1,
        },
      },
    ];
    return this.userModel.aggregate<RoleCount>(pipeline);
  }

  private async getTopCandidates() {
    const pipeline = [
      {
        $match: this.withNotDeleted({
          userId: { $ne: null },
        }),
      },
      {
        $group: {
          _id: '$userId',
          totalApplications: { $sum: 1 },
          lastAppliedAt: { $max: '$createdAt' },
          jobIds: { $addToSet: '$jobId' },
          companyIds: { $addToSet: '$companyId' },
        },
      },
      {
        $project: {
          _id: 1,
          totalApplications: 1,
          lastAppliedAt: 1,
          jobsCount: {
            $size: {
              $filter: {
                input: '$jobIds',
                as: 'jobId',
                cond: { $ne: ['$$jobId', null] },
              },
            },
          },
          companiesCount: {
            $size: {
              $filter: {
                input: '$companyIds',
                as: 'companyId',
                cond: { $ne: ['$$companyId', null] },
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: this.userModel.collection.name,
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          user: { $ne: null },
          $and: [
            {
              $or: [
                { 'user.isDeleted': { $exists: false } },
                { 'user.isDeleted': false },
                { 'user.isDeleted': null },
              ],
            },
            {
              $or: [
                { 'user.deletedAt': { $exists: false } },
                { 'user.deletedAt': null },
              ],
            },
          ],
        },
      },
      {
        $project: {
          userId: { $toString: '$_id' },
          totalApplications: 1,
          lastAppliedAt: 1,
          jobsCount: 1,
          companiesCount: 1,
          name: {
            $ifNull: [
              {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$user.name', null] },
                      { $ne: ['$user.name', ''] },
                    ],
                  },
                  '$user.name',
                  null,
                ],
              },
              '$user.email',
            ],
          },
          email: '$user.email',
          phone: '$user.phone',
          avatar: '$user.avatar',
          company: '$user.company.name',
        },
      },
      {
        $sort: {
          totalApplications: -1,
          lastAppliedAt: -1,
        },
      },
      { $limit: 10 },
    ];

    return this.resumeModel.aggregate(pipeline as any[]);
  }

  private async getTopHRs() {
    const pipeline = [
      {
        $match: this.withNotDeleted({
          'createdBy._id': { $ne: null },
        }),
      },
      {
        $group: {
          _id: '$createdBy._id',
          totalJobs: { $sum: 1 },
          lastPostedAt: { $max: '$createdAt' },
          companyNames: {
            $addToSet: '$company.name',
          },
          creatorEmails: {
            $addToSet: '$createdBy.email',
          },
        },
      },
      {
        $lookup: {
          from: this.userModel.collection.name,
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true,
        },
      },
      // Fallback: nếu không join được theo _id, thử tìm user qua email người tạo
      {
        $lookup: {
          from: this.userModel.collection.name,
          let: { creatorEmails: '$creatorEmails' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ['$email', '$$creatorEmails'] },
                    {
                      $or: [
                        { $eq: ['$isDeleted', false] },
                        { $not: ['$isDeleted'] },
                        { $eq: ['$isDeleted', null] },
                      ],
                    },
                    {
                      $or: [
                        { $eq: ['$deletedAt', null] },
                        { $not: ['$deletedAt'] },
                      ],
                    },
                  ],
                },
              },
            },
            { $project: { avatar: 1, email: 1, name: 1 } },
          ],
          as: 'altUsers',
        },
      },
      {
        $project: {
          userId: { $toString: '$_id' },
          totalJobs: 1,
          lastPostedAt: 1,
          companyNames: {
            $filter: {
              input: '$companyNames',
              as: 'companyName',
              cond: { $ne: ['$$companyName', null] },
            },
          },
          name: {
            $ifNull: [
              {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$user.name', null] },
                      { $ne: ['$user.name', ''] },
                    ],
                  },
                  '$user.name',
                  null,
                ],
              },
              {
                $arrayElemAt: [
                  {
                    $map: {
                      input: '$altUsers',
                      as: 'u',
                      in: '$$u.name',
                    },
                  },
                  0,
                ],
              },
            ],
          },
          email: {
            $ifNull: [
              '$user.email',
              {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: '$creatorEmails',
                      as: 'creatorEmail',
                      cond: { $ne: ['$$creatorEmail', null] },
                    },
                  },
                  0,
                ],
              },
            ],
          },
          phone: '$user.phone',
          avatar: {
            $ifNull: [
              '$user.avatar',
              {
                $arrayElemAt: [
                  {
                    $map: {
                      input: '$altUsers',
                      as: 'u',
                      in: '$$u.avatar',
                    },
                  },
                  0,
                ],
              },
            ],
          },
          company: '$user.company.name',
        },
      },
      {
        $sort: {
          totalJobs: -1,
          lastPostedAt: -1,
        },
      },
      { $limit: 10 },
    ];

    return this.jobModel.aggregate(pipeline as any[]);
  }

  private async getApplicationsTrend(days: number) {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const pipeline = [
      {
        $match: this.withNotDeleted({
          createdAt: { $gte: start },
        }),
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const raw = await this.resumeModel.aggregate<{ _id: string; count: number }>(pipeline as any[]);
    const map = new Map<string, number>();
    raw.forEach((item) => map.set(item._id, item.count));

    const data: { date: string; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const key = date.toISOString().slice(0, 10);
      data.push({
        date: key,
        count: map.get(key) || 0,
      });
    }
    return data;
  }

  private async getJobsTrend(months: number) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

    const pipeline = [
      {
        $match: this.withNotDeleted({
          createdAt: { $gte: start },
        }),
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m',
              date: '$createdAt',
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const raw = await this.jobModel.aggregate<{ _id: string; count: number }>(pipeline as any[]);
    const map = new Map<string, number>();
    raw.forEach((item) => map.set(item._id, item.count));

    const data: { month: string; count: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
      data.push({
        month: key,
        count: map.get(key) || 0,
      });
    }

    return data;
  }

  private async getUniqueApplicantsInMonth(startOfMonth: Date) {
    const pipeline = [
      {
        $match: this.withNotDeleted({
          createdAt: { $gte: startOfMonth },
        }),
      },
      {
        $group: {
          _id: '$userId',
        },
      },
      {
        $count: 'count',
      },
    ];
    const res = await this.resumeModel.aggregate<{ count: number }>(pipeline);
    return res?.[0]?.count || 0;
  }

  async getOverview() {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsersRaw,
      totalJobs,
      activeJobs,
      totalCompanies,
      totalApplications,
      applicationsToday,
      applicationsThisMonth,
      roleCounts,
      applicationsTrend,
      jobsTrend,
      topCandidates,
      topHRs,
      uniqueApplicantsThisMonth,
    ] = await Promise.all([
      this.userModel.countDocuments(this.notDeletedCondition()),
      this.jobModel.countDocuments(this.notDeletedCondition()),
      this.jobModel.countDocuments(this.withNotDeleted({ isActive: true })),
      this.companyModel.countDocuments(this.notDeletedCondition()),
      this.resumeModel.countDocuments(this.notDeletedCondition()),
      this.resumeModel.countDocuments(this.withNotDeleted({ createdAt: { $gte: startOfDay } })),
      this.resumeModel.countDocuments(this.withNotDeleted({ createdAt: { $gte: startOfMonth } })),
      this.getRoleCounts(),
      this.getApplicationsTrend(7),
      this.getJobsTrend(6),
      this.getTopCandidates(),
      this.getTopHRs(),
      this.getUniqueApplicantsInMonth(startOfMonth),
    ]);

    const userSummary = this.extractRoleCounts(roleCounts);

    return {
      totals: {
        users: {
          total: totalUsersRaw,
          byRole: userSummary,
        },
        jobs: {
          total: totalJobs,
          active: activeJobs,
        },
        applications: {
          total: totalApplications,
          today: applicationsToday,
          thisMonth: applicationsThisMonth,
          uniqueApplicantsThisMonth,
        },
        companies: totalCompanies,
      },
      trends: {
        applicationsLast7Days: applicationsTrend,
        jobsLast6Months: jobsTrend,
      },
      leaderboards: {
        topCandidates,
        topHRs,
      },
    };
  }
}

