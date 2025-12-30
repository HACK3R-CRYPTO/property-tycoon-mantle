import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { QuestsService } from './quests.service';

@Controller('quests')
export class QuestsController {
  constructor(private readonly questsService: QuestsService) {}

  @Get()
  findAll(@Query('address') address?: string) {
    return this.questsService.findAll(address);
  }

  @Get('sync')
  async syncQuests() {
    await this.questsService.syncQuestsFromContract();
    return { message: 'Quests synced from contract' };
  }

  @Get('progress/:address')
  getQuestProgress(@Param('address') address: string) {
    return this.questsService.getQuestProgress(address);
  }

  @Get('check/:address/:questId')
  checkQuestCompletion(@Param('address') address: string, @Param('questId') questId: string) {
    return this.questsService.checkQuestCompletion(address, Number(questId));
  }

  @Get('sync-progress/:address')
  async syncProgress(@Param('address') address: string) {
    await this.questsService.syncQuestProgressForUser(address);
    return { message: 'Quest progress synced from contract' };
  }

  @Post(':id/claim')
  async claimQuest(@Param('id') id: string, @Body() body: { address: string }) {
    return this.questsService.claimQuest(body.address, Number(id));
  }

  @Get(':id')
  getQuest(@Param('id') id: string) {
    return this.questsService.getQuest(Number(id));
  }
}
