import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): { status: string; message: string; timestamp: string } {
    return {
      status: 'ok',
      message: 'Clash on Somnia API is running',
      timestamp: new Date().toISOString(),
    };
  }
}
