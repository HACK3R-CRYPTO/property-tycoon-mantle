import { Test, TestingModule } from '@nestjs/testing';
import { YieldController } from './yield.controller';

describe('YieldController', () => {
  let controller: YieldController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [YieldController],
    }).compile();

    controller = module.get<YieldController>(YieldController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
