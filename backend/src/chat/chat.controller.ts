import { Controller, Post, Get, Body, Query, Headers } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({ summary: 'Send a chat message' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async sendMessage(
    @Body() body: { message: string; walletAddress: string },
    @Headers('x-wallet-address') walletAddressHeader?: string,
  ) {
    const walletAddress = body.walletAddress || walletAddressHeader;
    if (!walletAddress) {
      throw new Error('Wallet address is required');
    }

    return this.chatService.sendMessage(walletAddress, body.message);
  }

  @Get('messages')
  @ApiOperation({ summary: 'Get recent chat messages' })
  @ApiResponse({ status: 200, description: 'List of recent messages' })
  async getMessages(@Query('limit') limit?: string) {
    return this.chatService.getRecentMessages(limit ? Number(limit) : 50);
  }
}

