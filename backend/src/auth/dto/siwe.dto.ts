import { IsString, IsNotEmpty, IsEthereumAddress } from 'class-validator';

/**
 * DTO for requesting a nonce for SIWE authentication
 */
export class GetNonceDto {
  @IsEthereumAddress()
  @IsNotEmpty()
  walletAddress: string;
}

/**
 * DTO for verifying a SIWE signature
 */
export class VerifySiweDto {
  @IsString()
  @IsNotEmpty()
  message: string; // The SIWE message that was signed

  @IsString()
  @IsNotEmpty()
  signature: string; // The signature from the wallet

  @IsEthereumAddress()
  @IsNotEmpty()
  walletAddress: string; // The wallet address that signed the message
}
