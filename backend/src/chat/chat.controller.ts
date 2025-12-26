import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { SomniaService } from '../somnia/somnia.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('chat')
export class ChatController {
  constructor(private readonly somniaService: SomniaService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async sendMessage(@Request() req, @Body() body: { content: string }) {
    // Use the authenticated user's username as the sender
    const sender = req.user.username;
    // TODO: Get user's avatar from profile if available
    const avatar = 'default'; 

    return await this.somniaService.publishChatMessage(sender, body.content, avatar);
  }
}
