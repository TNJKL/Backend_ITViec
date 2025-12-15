import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { ServicePackage, ServicePackageDocument } from '../service-packages/schemas/service-package.schema';
import { UserPackage, UserPackageDocument } from '../user-packages/schemas/user-package.schema';
import { IUser } from '../users/users.interface';
import { UserPackagesService } from '../user-packages/user-packages.service';
import * as crypto from 'crypto';
import mongoose from 'mongoose';

@Injectable()
export class PaymentsService {
  private vnp_TmnCode: string;
  private vnp_HashSecret: string;
  private vnp_Url: string;
  private vnp_ReturnUrl: string;

  constructor(
    private configService: ConfigService,
    @InjectModel(ServicePackage.name)
    private servicePackageModel: SoftDeleteModel<ServicePackageDocument>,
    @InjectModel(UserPackage.name)
    private userPackageModel: SoftDeleteModel<UserPackageDocument>,
    private userPackagesService: UserPackagesService,
  ) {
    this.vnp_TmnCode = (this.configService.get<string>('VNPAY_TMN_CODE') || '').trim();
    this.vnp_HashSecret = (this.configService.get<string>('VNPAY_HASH_SECRET') || '').trim();
    this.vnp_Url = this.configService.get<string>('VNPAY_URL') || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    this.vnp_ReturnUrl = this.configService.get<string>('VNPAY_RETURN_URL') || 'http://localhost:3000/payment/callback';
  }

  // Tạo payment URL cho VNPay
  async createPaymentUrl(packageId: string, user: IUser, ipAddr: string = '127.0.0.1'): Promise<string> {
    // Kiểm tra gói dịch vụ
    const servicePackage = await this.servicePackageModel.findOne({
      _id: new mongoose.Types.ObjectId(packageId as any),
      isActive: true,
      isDeleted: false,
    });

    if (!servicePackage) {
      throw new BadRequestException('Gói dịch vụ không tồn tại hoặc không còn hoạt động');
    }

    // Tạo order ID
    const orderId = `PKG_${Date.now()}_${user._id}`;
    const amount = servicePackage.price;
    const orderInfo = `Thanh toan goi dich vu ${servicePackage.name}`;
    const orderType = 'other';
    const locale = 'vn';
    const currCode = 'VND';

    // Kiểm tra cấu hình VNPay
    if (!this.vnp_TmnCode || !this.vnp_HashSecret) {
      throw new BadRequestException('Cấu hình VNPay chưa đầy đủ. Vui lòng kiểm tra VNPAY_TMN_CODE và VNPAY_HASH_SECRET');
    }

    // Format ngày tháng đúng format VNPay: yyyyMMddHHmmss
    const now = new Date();
    const createDate = this.formatDate(now);
    const expireDate = this.formatDate(new Date(now.getTime() + 15 * 60 * 1000));

    let vnp_Params: any = {};
    vnp_Params['vnp_Version'] = '2.1.0';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = this.vnp_TmnCode;
    vnp_Params['vnp_Locale'] = locale;
    vnp_Params['vnp_CurrCode'] = currCode;
    vnp_Params['vnp_TxnRef'] = orderId;
    // VNPay yêu cầu vnp_OrderInfo không chứa ký tự đặc biệt như |, thay bằng dấu phẩy hoặc dấu gạch ngang
    vnp_Params['vnp_OrderInfo'] = `${orderInfo},packageId:${packageId},userId:${user._id}`;
    vnp_Params['vnp_OrderType'] = orderType;
    vnp_Params['vnp_Amount'] = amount * 100; // VNPay yêu cầu số tiền nhân 100
    vnp_Params['vnp_ReturnUrl'] = this.vnp_ReturnUrl;
    // Chuyển IPv6 localhost thành IPv4
    const normalizedIp = ipAddr === '::1' || ipAddr === '::ffff:127.0.0.1' ? '127.0.0.1' : ipAddr;
    vnp_Params['vnp_IpAddr'] = normalizedIp;
    vnp_Params['vnp_CreateDate'] = createDate;
    vnp_Params['vnp_ExpireDate'] = expireDate;

    // QUAN TRỌNG: VNPay yêu cầu encode TẤT CẢ giá trị TRƯỚC KHI tạo signData
    // Sử dụng hàm vnPayEncode() theo chuẩn VNPay (RFC 3986)
    // KHÔNG có ngoại lệ - TẤT CẢ params đều phải encode, bao gồm cả vnp_ReturnUrl
    const encodedParams: any = {};
    for (const key in vnp_Params) {
      const value = vnp_Params[key];
      if (value !== null && value !== undefined && value !== '') {
        // Encode TẤT CẢ giá trị theo chuẩn VNPay trước khi tạo signData
        encodedParams[key] = this.vnPayEncode(String(value));
      }
    }

    // Sắp xếp params đã encode
    const sorted = this.sortObject(encodedParams);

    // Tạo query string từ các giá trị đã encode để hash
    // Lưu ý: phải tạo signData TRƯỚC KHI thêm vnp_SecureHash vào params
    const signData = this.createQueryString(sorted);
    
    // Tạo hash signature - VNPay hỗ trợ cả SHA256 và SHA512
    // VNPay yêu cầu vnp_SecureHashType là "HmacSHA512" hoặc "HmacSHA256"
    const hashTypeConfig = (this.configService.get<string>('VNPAY_HASH_TYPE') || 'HmacSHA512').toUpperCase();
    // Xác định algorithm cho crypto và hashType cho VNPay
    let algorithm: string;
    let hashType: string;
    
    if (hashTypeConfig === 'HMACSHA512' || hashTypeConfig === 'SHA512') {
      algorithm = 'sha512';
      hashType = 'HmacSHA512';
    } else {
      algorithm = 'sha256';
      hashType = 'HmacSHA256';
    }
    
    // Tạo hash theo chuẩn VNPay: HMAC với secret key
    // KHÔNG dùng Buffer, dùng string trực tiếp (theo code mẫu VNPay)
    const hmac = crypto.createHmac(algorithm, this.vnp_HashSecret);
    const signed = hmac.update(signData, 'utf-8').digest('hex');
    
    // Thêm chữ ký vào params đã encode và đã sắp xếp
    sorted['vnp_SecureHash'] = signed;
    sorted['vnp_SecureHashType'] = hashType;

    // Tạo payment URL với query string từ params đã encode
    // KHÔNG encode thêm lần nào nữa (đã encode rồi)
    const paymentUrl = this.vnp_Url + '?' + this.createQueryStringFromEncoded(sorted);

    // Log để debug (chỉ log trong development)
    if (process.env.NODE_ENV !== 'production') {
      console.log('=== VNPay Payment URL Params ===');
      console.log('vnp_TmnCode:', this.vnp_TmnCode);
      console.log('vnp_ReturnUrl:', this.vnp_ReturnUrl);
      console.log('vnp_Amount (raw):', vnp_Params['vnp_Amount']);
      console.log('vnp_TxnRef (raw):', vnp_Params['vnp_TxnRef']);
      console.log('vnp_OrderInfo (raw):', vnp_Params['vnp_OrderInfo']);
      console.log('vnp_OrderInfo (encoded):', sorted['vnp_OrderInfo']);
      console.log('vnp_ReturnUrl (raw):', vnp_Params['vnp_ReturnUrl']);
      console.log('vnp_ReturnUrl (encoded in signData):', sorted['vnp_ReturnUrl']);
      console.log('vnp_IpAddr:', vnp_Params['vnp_IpAddr']);
      console.log('vnp_CreateDate:', vnp_Params['vnp_CreateDate']);
      console.log('vnp_ExpireDate:', vnp_Params['vnp_ExpireDate']);
      console.log('vnp_SecureHashType:', hashType);
      console.log('--- Sign Data (for hash) - ALL VALUES ARE ENCODED (including vnp_ReturnUrl) ---');
      console.log('signData:', signData);
      console.log('signDataLength:', signData.length);
      console.log('--- Hash Info ---');
      console.log('hashAlgorithm:', algorithm);
      console.log('hashSecretLength:', this.vnp_HashSecret.length);
      console.log('hashSecret:', this.vnp_HashSecret);
      console.log('vnp_SecureHash:', signed);
      console.log('--- Payment URL ---');
      console.log('paymentUrl:', paymentUrl);
      console.log('==============================');
    }

    return paymentUrl;
  }

  // Xử lý callback từ VNPay
  async handlePaymentCallback(query: any): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const vnp_Params = { ...query };
      const secureHash = vnp_Params['vnp_SecureHash'];
      delete vnp_Params['vnp_SecureHash'];
      delete vnp_Params['vnp_SecureHashType'];

      // QUAN TRỌNG: VNPay gửi về params đã decode, nhưng khi verify hash
      // cần encode lại giống như khi tạo signData (dùng vnPayEncode)
      // TẤT CẢ params đều phải encode, bao gồm cả vnp_ReturnUrl
      const encodedParams: any = {};
      for (const key in vnp_Params) {
        const value = vnp_Params[key];
        if (value !== null && value !== undefined && value !== '') {
          // Encode TẤT CẢ giá trị theo chuẩn VNPay trước khi tạo signData để verify
          encodedParams[key] = this.vnPayEncode(String(value));
        }
      }

      // Sắp xếp lại params đã encode
      const sortedParams = this.sortObject(encodedParams);

      // Tạo lại chữ ký từ params đã encode
      const signData = this.createQueryString(sortedParams);
      // Kiểm tra loại hash được sử dụng (mặc định HmacSHA512)
      const hashType = query['vnp_SecureHashType'] || 'HmacSHA512';
      const algorithm = (hashType === 'HmacSHA512' || hashType === 'SHA512') ? 'sha512' : 'sha256';
      // KHÔNG dùng Buffer, dùng string trực tiếp (theo code mẫu VNPay)
      const hmac = crypto.createHmac(algorithm, this.vnp_HashSecret);
      const signed = hmac.update(signData, 'utf-8').digest('hex');

      // Log để debug
      if (process.env.NODE_ENV !== 'production') {
        console.log('=== VNPay Callback Verification ===');
        console.log('Received secureHash:', secureHash);
        console.log('Calculated signed:', signed);
        console.log('Hash match:', secureHash === signed);
        console.log('SignData:', signData);
      }

      // Kiểm tra chữ ký
      if (secureHash !== signed) {
        return {
          success: false,
          message: 'Chữ ký không hợp lệ',
        };
      }

    const orderId = vnp_Params['vnp_TxnRef'];
    const rspCode = vnp_Params['vnp_ResponseCode'];
    const orderInfo = vnp_Params['vnp_OrderInfo'];

    // Log để debug
    if (process.env.NODE_ENV !== 'production') {
      console.log('Order Info:', orderInfo);
      console.log('Response Code:', rspCode);
      console.log('Transaction Ref:', orderId);
    }

    // Lấy packageId và userId từ orderInfo (format: text,packageId:xxx,userId:yyy)
    const packageIdMatch = orderInfo?.match(/packageId:([^,]+)/);
    const userIdMatch = orderInfo?.match(/userId:([^,]+)/);

    if (!packageIdMatch || !userIdMatch) {
      console.error('Invalid orderInfo format:', orderInfo);
      return {
        success: false,
        message: 'Thông tin đơn hàng không hợp lệ',
      };
    }

    const packageId = packageIdMatch[1].trim();
    const userId = userIdMatch[1].trim();

    // Kiểm tra response code
    if (rspCode === '00') {
      // Thanh toán thành công
      // Kiểm tra xem đã tạo UserPackage chưa (tránh duplicate)
      const existingPackage = await this.userPackageModel.findOne({
        userId: new mongoose.Types.ObjectId(userId as any),
        packageId: new mongoose.Types.ObjectId(packageId as any),
        createdAt: {
          $gte: new Date(Date.now() - 5 * 60 * 1000), // Trong vòng 5 phút
        },
      });

      if (existingPackage) {
        console.log('Package already exists, returning existing package');
        return {
          success: true,
          message: 'Thanh toán thành công. Gói dịch vụ đã được kích hoạt.',
          data: existingPackage,
        };
      }

      // Tạo UserPackage mới
      const servicePackage = await this.servicePackageModel.findById(packageId);
      if (!servicePackage) {
        console.error('Service package not found:', packageId);
        return {
          success: false,
          message: 'Gói dịch vụ không tồn tại',
        };
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + servicePackage.durationDays);

      const userPackage = await this.userPackageModel.create({
        userId: new mongoose.Types.ObjectId(userId as any),
        packageId: new mongoose.Types.ObjectId(packageId as any),
        startDate,
        endDate,
        usedJobs: 0,
        isActive: true,
        createdBy: {
          _id: new mongoose.Types.ObjectId(userId as any),
          email: '',
        },
      });

      console.log('UserPackage created successfully:', userPackage._id);
      return {
        success: true,
        message: 'Thanh toán thành công. Gói dịch vụ đã được kích hoạt.',
        data: userPackage,
      };
    } else {
      console.log('Payment failed, response code:', rspCode);
      return {
        success: false,
        message: `Thanh toán thất bại. Mã lỗi: ${rspCode}`,
      };
    }
    } catch (error: any) {
      console.error('Error in handlePaymentCallback:', error);
      return {
        success: false,
        message: error?.message || 'Có lỗi xảy ra khi xử lý callback',
      };
    }
  }

  // Hàm format ngày tháng theo format VNPay: yyyyMMddHHmmss
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  // Hàm encode theo chuẩn VNPay (RFC 3986 - Application/x-www-form-urlencoded)
  // VNPay KHÔNG dùng encodeURIComponent() chuẩn của JavaScript
  // Phải encode theo chuẩn riêng của VNPay
  private vnPayEncode(str: string): string {
    return encodeURIComponent(str)
      .replace(/%20/g, '+')
      .replace(/!/g, '%21')
      .replace(/'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29')
      .replace(/\*/g, '%2A')
      .replace(/%2C/gi, '%2C')
      .replace(/%3A/gi, '%3A');
  }

  // Hàm sắp xếp object theo key (theo chuẩn VNPay)
  private sortObject(obj: any): any {
    const sorted: any = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
      sorted[key] = obj[key];
    }
    return sorted;
  }

  // Tạo query string không encode (raw string) để hash
  // Theo chuẩn VNPay: sắp xếp theo key, loại bỏ vnp_SecureHash và vnp_SecureHashType
  // Chỉ lấy các giá trị không null, undefined hoặc rỗng
  private createQueryString(params: any): string {
    // Loại bỏ các giá trị null, undefined, rỗng và vnp_SecureHash, vnp_SecureHashType
    const filteredParams: any = {};
    for (const key in params) {
      if (key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType') {
        const value = params[key];
        if (value !== null && value !== undefined && value !== '') {
          filteredParams[key] = String(value).trim();
        }
      }
    }
    
    // Sắp xếp theo key
    const sortedKeys = Object.keys(filteredParams).sort();
    const queryParts: string[] = [];
    
    for (const key of sortedKeys) {
      queryParts.push(`${key}=${filteredParams[key]}`);
    }
    
    return queryParts.join('&');
  }

  // Tạo query string từ params ĐÃ ENCODE (dùng khi tạo URL)
  // Giá trị đã được encode bằng vnPayEncode() rồi (đã có + thay vì %20)
  private createQueryStringFromEncoded(params: any): string {
    // Loại bỏ các giá trị null, undefined, rỗng
    const filteredParams: any = {};
    for (const key in params) {
      const value = params[key];
      if (value !== null && value !== undefined && value !== '') {
        // Giá trị đã được encode bằng vnPayEncode() rồi
        filteredParams[key] = String(value);
      }
    }
    
    // Sắp xếp theo key
    const sortedKeys = Object.keys(filteredParams).sort();
    const queryParts: string[] = [];
    
    for (const key of sortedKeys) {
      queryParts.push(`${key}=${filteredParams[key]}`);
    }
    
    return queryParts.join('&');
  }

  // Lấy gói dịch vụ hiện tại của user
  async getCurrentPackage(userId: string) {
    return await this.userPackagesService.getActivePackage(userId);
  }

  async getActivePackages(userId: string) {
    return await this.userPackagesService.getPackagesOverview(userId);
  }
}

