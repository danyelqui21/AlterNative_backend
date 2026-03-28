import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  Req,
  UseGuards,
  RawBodyRequest,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsGatewayService } from '../services/payments-gateway.service';
import { StripeService } from '../services/stripe.service';
import { JwtAuthGuard, CurrentUser } from '@lagunapp-backend/auth';

@ApiTags('Payments / Pagos')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsGatewayService,
    private readonly stripeService: StripeService,
  ) {}

  @Post('create-intent')
  @UseGuards(JwtAuthGuard)
  createIntent(
    @CurrentUser('sub') userId: string,
    @Body()
    dto: {
      amount: number;
      currency?: string;
      description?: string;
      referenceType?: string;
      referenceId?: string;
    },
  ) {
    return this.paymentsService.createPaymentIntent(userId, dto);
  }

  @Post('webhook')
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ) {
    if (!req.rawBody) {
      throw new BadRequestException('Raw body not available');
    }
    const event = await this.stripeService.constructWebhookEvent(
      req.rawBody,
      sig,
    );
    return this.paymentsService.handleWebhook(event);
  }

  @Get('methods')
  @UseGuards(JwtAuthGuard)
  getMethods(@CurrentUser('sub') userId: string) {
    return this.paymentsService.getPaymentMethods(userId);
  }

  @Post('methods')
  @UseGuards(JwtAuthGuard)
  addMethod(
    @CurrentUser('sub') userId: string,
    @Body() dto: { stripePaymentMethodId: string },
  ) {
    return this.paymentsService.addPaymentMethod(
      userId,
      dto.stripePaymentMethodId,
    );
  }

  @Delete('methods/:id')
  @UseGuards(JwtAuthGuard)
  removeMethod(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.paymentsService.removePaymentMethod(userId, id);
  }

  @Put('methods/:id/default')
  @UseGuards(JwtAuthGuard)
  setDefault(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.paymentsService.setDefaultPaymentMethod(userId, id);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  history(
    @CurrentUser('sub') userId: string,
    @Query() filters: { page?: number; limit?: number },
  ) {
    return this.paymentsService.getPaymentHistory(userId, filters);
  }

  @Post('refund/:id')
  @UseGuards(JwtAuthGuard)
  refund(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.paymentsService.refundPayment(userId, id);
  }
}
