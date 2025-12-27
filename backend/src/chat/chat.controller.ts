import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ChatService, ChatMessageDto } from './chat.service';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('messages')
  @ApiOperation({ summary: 'Send a chat message' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async sendMessage(
    @Body('walletAddress') walletAddress: string,
    @Body('message') message: string,
  ): Promise<ChatMessageDto> {
    return this.chatService.sendMessage(walletAddress, message);
  }

  @Get('messages')
  @ApiOperation({ summary: 'Get recent chat messages' })
  @ApiResponse({ status: 200, description: 'List of chat messages' })
  async getMessages(@Query('limit') limit?: number): Promise<ChatMessageDto[]> {
    return this.chatService.getRecentMessages(limit || 100);
  }
}

