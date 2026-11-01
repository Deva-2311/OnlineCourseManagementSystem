import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { VerifySessionDto } from './dto/verify-session.dto';
import {
  CheckoutSessionResponseDto,
  SafePaymentDto,
} from './dto/payment-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout-session')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create a Stripe Checkout Session for a paid course (Student only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Checkout session created successfully',
    type: CheckoutSessionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Course is free, unpublished, or unmet prerequisites' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 409, description: 'Student already actively enrolled or paid' })
  async createCheckoutSession(
    @CurrentUser() user: User,
    @Body() dto: CreateCheckoutSessionDto,
  ): Promise<CheckoutSessionResponseDto> {
    return this.paymentsService.createCheckoutSession(
      user.id,
      user.email,
      dto.courseId,
    );
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook receiver for asynchronous payment verification' })
  @ApiHeader({
    name: 'stripe-signature',
    description: 'Cryptographic signature from Stripe for payload verification',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid signature or payload' })
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: any,
  ): Promise<{ received: boolean; status?: string }> {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = req.rawBody || (req.body ? Buffer.from(JSON.stringify(req.body)) : null);
    if (!rawBody) {
      throw new BadRequestException('Missing raw request body for webhook verification');
    }

    return this.paymentsService.handleWebhook(signature, rawBody);
  }

  @Get(':paymentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment status by payment ID (Owner Student or Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Payment record details',
    type: SafePaymentDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied to this payment record' })
  @ApiResponse({ status: 404, description: 'Payment record not found' })
  async getPaymentById(
    @CurrentUser() user: User,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
  ): Promise<SafePaymentDto> {
    return this.paymentsService.getPaymentById(paymentId, user.id, user.role);
  }

  @Post(':paymentId/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Direct server-side reconciliation for a Stripe checkout session (Student only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Reconciled payment record details',
    type: SafePaymentDto,
  })
  async reconcilePaymentSession(
    @CurrentUser() user: User,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
  ): Promise<SafePaymentDto> {
    return this.paymentsService.reconcilePaymentSession(paymentId, user.id);
  }

  @Post('verify-session')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Direct server-side reconciliation for a Stripe checkout session by session_id (Student only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Reconciled payment record details',
    type: SafePaymentDto,
  })
  async reconcileCheckoutSession(
    @CurrentUser() user: User,
    @Body() dto: VerifySessionDto,
  ): Promise<SafePaymentDto> {
    return this.paymentsService.reconcileSessionBySessionId(dto.sessionId, user.id);
  }
}
