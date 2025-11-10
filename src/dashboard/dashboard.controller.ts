import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ResponseMessage } from 'src/decorator/customize';

@Controller({
  path: 'dashboard',
  version: '1',
})
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ResponseMessage('Get dashboard overview')
  getOverview(): Promise<any> {
    return this.dashboardService.getOverview();
  }
}

