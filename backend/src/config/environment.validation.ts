import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsString, IsUrl, validateSync, IsOptional, IsBooleanString } from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  PORT: number;

  @IsString()
  API_PREFIX: string;

  @IsUrl({ require_tld: false })
  FRONTEND_URL: string;

  @IsString()
  DATABASE_URL: string;

  @IsOptional()
  @IsBooleanString()
  SWAGGER_ENABLED?: string;

  @IsOptional()
  @IsString()
  SWAGGER_PATH?: string;

  @IsString()
  JWT_ACCESS_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_EXPIRATION?: string;

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_REFRESH_EXPIRATION?: string;

  @IsOptional()
  @IsNumber()
  THROTTLE_TTL?: number;

  @IsOptional()
  @IsNumber()
  THROTTLE_LIMIT?: number;

  @IsOptional()
  @IsString()
  STRIPE_SECRET_KEY?: string;

  @IsOptional()
  @IsString()
  STRIPE_PUBLISHABLE_KEY?: string;

  @IsOptional()
  @IsString()
  STRIPE_WEBHOOK_SECRET?: string;

  @IsOptional()
  @IsString()
  STRIPE_SUCCESS_URL?: string;

  @IsOptional()
  @IsString()
  STRIPE_CANCEL_URL?: string;

  @IsOptional()
  @IsString()
  STRIPE_CURRENCY?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(
    EnvironmentVariables,
    config,
    { enableImplicitConversion: true },
  );
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
