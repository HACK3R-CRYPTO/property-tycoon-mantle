import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Req, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { UpdateUsernameDto, GetNonceDto, VerifySiweDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}



  @Post('nonce')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate nonce for SIWE authentication' })
  @ApiResponse({ status: 200, description: 'Nonce generated successfully' })
  async getNonce(@Body() getNonceDto: GetNonceDto) {
    const nonce = await this.authService.generateNonce(getNonceDto.walletAddress);
    return { nonce };
  }

  @Post('siwe/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify SIWE signature and login/register user' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 401, description: 'Invalid signature or message' })
  @ApiResponse({ status: 400, description: 'Invalid nonce or expired' })
  async verifySiwe(@Body() verifySiweDto: VerifySiweDto) {
    return this.authService.verifySiweAndLogin(verifySiweDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Req() req) {
    return req.user;
  }

  @Patch('username')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update username' })
  @ApiResponse({ status: 200, description: 'Username updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Username already exists' })
  async updateUsername(@Req() req, @Body() updateUsernameDto: UpdateUsernameDto) {
    return this.authService.updateUsername(req.user.userId, updateUsernameDto);
  }
}
