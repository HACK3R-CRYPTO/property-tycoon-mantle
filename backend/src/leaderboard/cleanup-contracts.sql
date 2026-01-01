-- Cleanup script to remove contract addresses from leaderboard
-- Run this in your PostgreSQL database

-- First, identify contract addresses
-- Marketplace (old): 0x6389D7168029715DE118Baf51B6D32eE1EBEa46B
-- Marketplace (new): 0xe9E855ff6EB78055AaE90631468BfC948A1446Bb
-- Add other contract addresses as needed

-- Delete leaderboard entries for contract addresses
DELETE FROM leaderboard 
WHERE user_id IN (
  SELECT id FROM users 
  WHERE LOWER(wallet_address) IN (
    LOWER('0x6389D7168029715DE118Baf51B6D32eE1EBEa46B'),  -- Old marketplace
    LOWER('0xe9E855ff6EB78055AaE90631468BfC948A1446Bb'),  -- New marketplace
    LOWER('0x7549a25b9a5206569f6778c6be6a7620687f5A38'),  -- Yield Distributor
    LOWER('0xb5a595A6cd30D1798387A2c781E0646FCA8c4AeD'),  -- Quest System
    LOWER('0x0AE7119c7187D88643fb7B409937B68828eE733D'),  -- PropertyNFT
    LOWER('0x32D9a9b9e241Da421f34786De0B39fD34D1EfeA8')   -- GameToken
  )
);

-- Optionally, delete user entries for contracts (if you want)
-- DELETE FROM users 
-- WHERE LOWER(wallet_address) IN (
--   LOWER('0x6389D7168029715DE118Baf51B6D32eE1EBEa46B'),
--   LOWER('0xe9E855ff6EB78055AaE90631468BfC948A1446Bb'),
--   LOWER('0x7549a25b9a5206569f6778c6be6a7620687f5A38'),
--   LOWER('0xb5a595A6cd30D1798387A2c781E0646FCA8c4AeD'),
--   LOWER('0x0AE7119c7187D88643fb7B409937B68828eE733D'),
--   LOWER('0x32D9a9b9e241Da421f34786De0B39fD34D1EfeA8')
-- );






