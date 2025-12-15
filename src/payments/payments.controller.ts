import { Controller, Get, Post, Body, Query, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Public, ResponseMessage, User } from 'src/decorator/customize';
import { IUser } from 'src/users/users.interface';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

@ApiTags('payments')
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create')
  @ResponseMessage('Tạo URL thanh toán VNPay')
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto, 
    @User() user: IUser,
    @Req() req: Request
  ) {
    // Lấy IP từ request
    const ipAddr = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || '127.0.0.1';
    const clientIp = Array.isArray(ipAddr) ? ipAddr[0] : ipAddr.split(',')[0].trim();
    
    const paymentUrl = await this.paymentsService.createPaymentUrl(
      createPaymentDto.packageId,
      user,
      clientIp,
    );
    return {
      paymentUrl,
    };
  }

  @Get('callback')
  @Public()
  @ResponseMessage('Xử lý callback từ VNPay')
  async paymentCallback(@Query() query: any) {
    try {
      // Log để debug
      console.log('========================================');
      console.log('=== VNPay Callback Received ===');
      console.log('Timestamp:', new Date().toISOString());
      console.log('Query params:', JSON.stringify(query, null, 2));
      
      const result = await this.paymentsService.handlePaymentCallback(query);
      
      console.log('Callback result:', result);
      
      // Trả về JSON response để frontend xử lý
      return {
        success: result.success,
        message: result.message,
        data: result.data
      };
    } catch (error: any) {
      console.error('Error in paymentCallback controller:', error);
      return {
        success: false,
        message: error?.message || 'Có lỗi xảy ra khi xử lý thanh toán'
      };
    }
  }

  @Get('current-package')
  @ResponseMessage('Lấy gói dịch vụ hiện tại của user')
  async getCurrentPackage(@User() user: IUser) {
    const userPackage = await this.paymentsService.getCurrentPackage(user._id as string);
    return userPackage;
  }

  @Get('active-packages')
  @ResponseMessage('Danh sách các gói đang hoạt động của user')
  async getActivePackages(@User() user: IUser) {
    return await this.paymentsService.getActivePackages(user._id as string);
  }

  @Get('test')
  @Public()
  @ResponseMessage('Test endpoint')
  async test() {
    return { message: 'Backend is running!', timestamp: new Date().toISOString() };
  }
}

