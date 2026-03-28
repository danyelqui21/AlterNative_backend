import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentsGatewayService } from '../services/payments-gateway.service';
import { JwtAuthGuard } from '@lagunapp-backend/auth';

@ApiTags('Admin: Payments / Pagos')
@Controller('admin/payments')
@UseGuards(JwtAuthGuard)
export class AdminPaymentsController {
  constructor(private readonly paymentsService: PaymentsGatewayService) {}

  @Get('stats')
  stats() {
    return this.paymentsService.adminStats();
  }

  @Get()
  findAll(
    @Query()
    filters: {
      status?: string;
      userId?: string;
      referenceType?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    },
  ) {
    return this.paymentsService.adminFindAll(filters);
  }

  @Post(':id/refund')
  refund(@Param('id') id: string) {
    return this.paymentsService.adminRefund(id);
  }
}
