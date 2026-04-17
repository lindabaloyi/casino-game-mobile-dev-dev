/**
 * Migration script to reset all GameStats to zero
 * Resets: totalGames, wins, losses, totalPointsKept, pointRetentionPerGame, motorAchievementCount, modeStats
 */

const { MongoClient } = require('mongodb');

async function resetGameStats() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://lindabaloyi10_db_user:ZJYvwn0VQT86uROc@casinodotzadb.zsvno3e.mongodb.net/?appName=casinodotzaDB';
  const dbName = process.env.MONGODB_DB_NAME || 'casinodotza';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('gameStats');

    console.log('[Reset] Starting GameStats reset...');

    const result = await collection.updateMany(
      {},
      {
        $set: {
          totalGames: 0,
          wins: 0,
          losses: 0,
          totalPointsKept: 0,
          pointRetentionPerGame: 0,
          motorAchievementCount: 0,
          modeStats: {
            twoHands: { games: 0, wins: 0, losses: 0 },
            threeHands: { games: 0, wins: 0, losses: 0 },
            fourHands: { games: 0, wins: 0, losses: 0 },
            party: { games: 0, wins: 0, losses: 0 },
            freeforall: { games: 0, wins: 0, losses: 0 },
            tournament: { games: 0, wins: 0, losses: 0 }
          },
          updatedAt: new Date()
        }
      }
    );

    console.log(`[Reset] ✅ Reset ${result.modifiedCount} documents to 0`);
    
    await client.close();
    process.exit(0);
  } catch (error) {
    console.error('[Reset] ❌ Error:', error.message);
    await client.close();
    process.exit(1);
  }
}

resetGameStats();