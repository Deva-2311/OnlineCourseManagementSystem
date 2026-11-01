import { ApiProperty } from '@nestjs/swagger';

export class RecommendedCourseItemDto {
  @ApiProperty({ description: 'Public course summary payload' })
  course: any;

  @ApiProperty({
    description: 'Human-readable explanation for why this course was recommended',
    example: 'Matches your learning history in Web Development',
  })
  reason: string;

  @ApiProperty({
    description: 'Transparent deterministic recommendation ranking score',
    example: 75,
  })
  score: number;

  @ApiProperty({
    description: 'List of underlying signals that influenced the recommendation',
    type: [String],
    example: [
      'Matches your interest in Web Development',
      'Direct progression following your completed coursework',
    ],
  })
  signals: string[];
}

export class RecommendationMetaDto {
  @ApiProperty({ description: 'Total recommended courses returned', example: 4 })
  total: number;

  @ApiProperty({ description: 'Maximum recommendations requested', example: 6 })
  limit: number;

  @ApiProperty({
    description: 'Indicates if fallback ranking was applied due to lack of student activity',
    example: false,
  })
  isFallback: boolean;
}

export class RecommendationResponseDto {
  @ApiProperty({ type: [RecommendedCourseItemDto] })
  data: RecommendedCourseItemDto[];

  @ApiProperty({ type: RecommendationMetaDto })
  meta: RecommendationMetaDto;
}
