import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { DataSource } from 'typeorm';

describe('HealthController', () => {
  let controller: HealthController;
  let mockDataSource: Partial<DataSource>;

  beforeEach(async () => {
    mockDataSource = {
      isInitialized: true,
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health status', async () => {
    const result = await controller.checkHealth();
    expect(result.status).toEqual('ok');
    expect(result.database).toEqual('healthy');
  });
});
