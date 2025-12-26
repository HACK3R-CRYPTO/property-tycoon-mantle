import { Controller, Get, Param } from '@nestjs/common';
import { QuestsService } from './quests.service';

@Controller('quests')
export class QuestsController {
  constructor(private readonly questsService: QuestsService) {}

  @Get()
  findAll() {
    return this.questsService.findAll();
  }

  @Get(':id')
  getQuest(@Param('id') id: string) {
    return this.questsService.getQuest(Number(id));
  }

  @Get('progress/:address')
  getQuestProgress(@Param('address') address: string) {
    return this.questsService.getQuestProgress(address);
  }

  @Get('check/:address/:questId')
  checkQuestCompletion(@Param('address') address: string, @Param('questId') questId: string) {
    return this.questsService.checkQuestCompletion(address, Number(questId));
  }
}
