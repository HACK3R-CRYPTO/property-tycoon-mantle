# Leveling System Explained

## How XP (Experience Points) is Calculated

Your total XP comes from **3 sources**:

### 1. Properties Owned
- **50 XP per property** (reduced from 100 for balanced progression)
- Example: 5 properties = 250 XP
- Example: 10 properties = 500 XP

### 2. Yield Earned
- **1 XP per 0.02 TYC earned** (reduced from 0.01 for balanced progression)
- Formula: `yieldXP = totalYieldEarned / 2e16`
- Example: 1.0 TYC earned = 50 XP
- Example: 0.5 TYC earned = 25 XP
- Example: 2.0 TYC earned = 100 XP

### 3. Portfolio Value
- **1 XP per 0.2 TYC in portfolio value** (reduced from 0.1 for balanced progression)
- Formula: `portfolioXP = totalPortfolioValue / 2e17`
- Example: 10 TYC portfolio = 50 XP
- Example: 5 TYC portfolio = 25 XP
- Example: 20 TYC portfolio = 100 XP

### Total XP Formula
```
Total XP = (Properties × 50) + (Yield Earned / 0.02) + (Portfolio Value / 0.2)
```

---

## How Levels Work

### Level Calculation Formula
```
Level = floor(√(Total XP / 1000)) + 1
```

This creates a **square root progression** where each level requires more XP than the previous one.

### Level Progression Table

| Level | XP Required | XP Range | XP Needed for Next Level |
|-------|-------------|----------|-------------------------|
| **Level 1** | 0 XP | 0 - 1,000 XP | 1,000 XP |
| **Level 2** | 1,000 XP | 1,000 - 4,000 XP | 3,000 XP |
| **Level 3** | 4,000 XP | 4,000 - 9,000 XP | 5,000 XP |
| **Level 4** | 9,000 XP | 9,000 - 16,000 XP | 7,000 XP |
| **Level 5** | 16,000 XP | 16,000 - 25,000 XP | 9,000 XP |
| **Level 10** | 81,000 XP | 81,000 - 100,000 XP | 19,000 XP |
| **Level 15** | 196,000 XP | 196,000 - 225,000 XP | 29,000 XP |
| **Level 20** | 361,000 XP | 361,000 - 400,000 XP | 39,000 XP |

### How to Progress to Next Level

**Example: Moving from Level 1 to Level 2**

1. Start at Level 1 with 0 XP
2. Need to reach **1,000 total XP** to reach Level 2
3. Ways to earn XP:
   - Own **20 properties** (20 × 50 = 1,000 XP) ✅ **Easiest way!**
   - Earn **0.2 TYC yield** (0.2 / 0.02 = 10 XP) - Need 100× more
   - Have **2 TYC portfolio** (2 / 0.2 = 10 XP) - Need 100× more
   - **Combination**: 10 properties (500 XP) + 0.1 TYC yield (5 XP) + 1 TYC portfolio (5 XP) = 510 XP... keep going!

**Example: Moving from Level 2 to Level 3**

1. Currently at Level 2 with 1,000 XP
2. Need to reach **4,000 total XP** to reach Level 3
3. Need **3,000 more XP** (4,000 - 1,000 = 3,000 XP)
4. Ways to earn 3,000 XP:
   - Own **60 more properties** (60 × 50 = 3,000 XP)
   - Earn **0.6 TYC more yield** (0.6 / 0.02 = 30 XP) - Need 100× more
   - Increase portfolio by **6 TYC** (6 / 0.2 = 30 XP) - Need 100× more
   - **Best strategy**: Mix of all three!

---

## Real Examples

### Player A: New Player
- **Properties**: 1
- **Yield Earned**: 0 TYC
- **Portfolio Value**: 0.1 TYC
- **XP Calculation**:
  - Properties: 1 × 50 = **50 XP**
  - Yield: 0 / 0.02 = **0 XP**
  - Portfolio: 0.1 / 0.2 = **0.5 XP**
  - **Total: 50.5 XP**
- **Level**: 1 (needs 949.5 more XP for Level 2)

### Player B: Active Player
- **Properties**: 15
- **Yield Earned**: 2.5 TYC
- **Portfolio Value**: 20 TYC
- **XP Calculation**:
  - Properties: 15 × 50 = **750 XP**
  - Yield: 2.5 / 0.02 = **125 XP**
  - Portfolio: 20 / 0.2 = **100 XP**
  - **Total: 975 XP**
- **Level**: 1 (needs 25 more XP for Level 2)

### Player C: Tycoon
- **Properties**: 50
- **Yield Earned**: 15 TYC
- **Portfolio Value**: 100 TYC
- **XP Calculation**:
  - Properties: 50 × 50 = **2,500 XP**
  - Yield: 15 / 0.02 = **750 XP**
  - Portfolio: 100 / 0.2 = **500 XP**
  - **Total: 3,750 XP**
- **Level**: 2 (needs 250 more XP for Level 3)

---

## Level Titles

Your title changes based on your level:

- **Level 1-4**: "RISING TYCOON" 🌱
- **Level 5-9**: "PRO TYCOON" 💼
- **Level 10-14**: "ELITE TYCOON" ⭐
- **Level 15-19**: "MASTER TYCOON" 👑
- **Level 20+**: "LEGENDARY TYCOON" 🏆

---

## When Level Updates

Your level is **automatically recalculated** when:

1. ✅ You mint a new property
2. ✅ You claim yield
3. ✅ Your portfolio value changes
4. ✅ Leaderboard updates (which happens after property/yield changes)

The backend calculates your level server-side and stores it in the database, so it's always accurate and can't be manipulated.

---

## Tips for Leveling Up

### Fastest Way to Level Up:
1. **Own more properties** - Each property = 50 XP (most efficient!)
2. **Claim yield regularly** - Earned yield = XP (1 XP per 0.02 TYC)
3. **Build valuable properties** - Higher portfolio value = more XP (1 XP per 0.2 TYC)

### Best Strategy:
- **Early levels (1-5)**: Focus on owning properties (50 XP each)
- **Mid levels (5-15)**: Mix of properties + yield earning
- **High levels (15+)**: Need all three - properties, yield, and high-value portfolio

---

## Technical Details

### Backend Calculation
- Calculated in `UsersService.updateUserLevel()`
- Runs automatically after leaderboard updates
- Stored in database: `users.total_experience_points` and `users.level`

### Frontend Display
- Shows current level, XP progress, and progress bar
- Calculated client-side for real-time display
- Syncs with backend data from API

