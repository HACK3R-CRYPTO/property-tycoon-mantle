import { Test, TestingModule } from '@nestjs/testing';
import { YieldService } from './yield.service';

describe('YieldService', () => {
  let service: YieldService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [YieldService],
    }).compile();

    service = module.get<YieldService>(YieldService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
