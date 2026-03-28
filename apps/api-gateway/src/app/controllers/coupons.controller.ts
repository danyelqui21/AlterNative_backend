import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminCouponsGatewayService } from '../services/admin-coupons-gateway.service';

@ApiTags('Coupons / Cupones')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly service: AdminCouponsGatewayService) {}

  @Get('validate/:code')
  validate(@Param('code') code: string) {
    return this.service.validateCoupon(code);
  }
}
