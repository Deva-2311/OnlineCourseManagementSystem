import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '../enums/payment-status.enum';

export class CheckoutSessionResponseDto {
  @ApiProperty({ description: 'Internal payment record ID' })
  paymentId: string;

  @ApiProperty({ description: 'Stripe Checkout Session ID' })
  checkoutSessionId: string;

  @ApiProperty({ description: 'URL to redirect the student to Stripe Checkout' })
  checkoutUrl: string;

  @ApiProperty({ description: 'Authoritative payment amount' })
  amount: number;

  @ApiProperty({ description: 'Payment currency code', example: 'USD' })
  currency: string;

  @ApiProperty({ enum: PaymentStatus, description: 'Current payment status' })
  status: PaymentStatus;
}

export class SafePaymentCourseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  thumbnailUrl?: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  currency: string;
}

export class SafePaymentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ enum: PaymentStatus })
  status: PaymentStatus;

  @ApiPropertyOptional({ nullable: true })
  paidAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional({ nullable: true })
  studentId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  courseId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  enrollmentId?: string | null;

  @ApiPropertyOptional({ type: SafePaymentCourseDto })
  course?: SafePaymentCourseDto;
}
