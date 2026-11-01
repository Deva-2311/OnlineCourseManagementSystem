import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check API and Database Health' })
  async checkHealth() {
    let dbStatus = 'unknown';
    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.query('SELECT 1');
        dbStatus = 'healthy';
      } else {
        dbStatus = 'uninitialized';
      }
    } catch {
      dbStatus = 'unhealthy';
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbStatus,
    };
  }
}
