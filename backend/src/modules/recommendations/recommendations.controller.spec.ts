import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { User } from '../users/entities/user.entity';

describe('RecommendationsController', () => {
  let controller: RecommendationsController;

  const mockRecommendationsService = {
    getRecommendationsForStudent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationsController],
      providers: [
        {
          provide: RecommendationsService,
          useValue: mockRecommendationsService,
        },
      ],
    }).compile();

    controller = module.get<RecommendationsController>(RecommendationsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call getRecommendationsForStudent with authenticated user id and query dto', async () => {
    const mockUser = { id: 'student-uuid-1' } as User;
    const query = { limit: 5 };
    const expectedResponse = {
      data: [],
      meta: { total: 0, limit: 5, isFallback: true },
    };

    mockRecommendationsService.getRecommendationsForStudent.mockResolvedValue(expectedResponse);

    const result = await controller.getMyRecommendations(mockUser, query);

    expect(mockRecommendationsService.getRecommendationsForStudent).toHaveBeenCalledWith('student-uuid-1', query);
    expect(result).toEqual(expectedResponse);
  });
});
