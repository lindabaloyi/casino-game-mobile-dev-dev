/**
 * Migration script to clean up GameStats documents
 * - Remove redundant 'spadesPointsKept' field
 * - Add missing default fields for all users
 * - Update modeStats keys to camelCase
 */

const { MongoClient } = require('mongodb');

async function migrateGameStats() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/casino-game';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('gameStats');

    console.log('[Migration] Starting GameStats cleanup migration...');

    // Get all GameStats documents
    const allStats = await collection.find({}).toArray();
    console.log(`[Migration] Found ${allStats.length} GameStats documents`);

    let updatedCount = 0;
    let removedFieldCount = 0;

    for (const stats of allStats) {
      const updateObj = { $unset: {}, $set: {} };
      let needsUpdate = false;

      // Remove spadesPointsKept if it exists
      if (stats.spadesPointsKept !== undefined) {
        updateObj.$unset.spadesPointsKept = '';
        removedFieldCount++;
        needsUpdate = true;
      }

      // Add missing default fields
      const defaults = {
        acesKept: 0,
        twoSpadesKept: 0,
        tenDiamondsKept: 0,
        spadesCountKept: 0,
        cardCountBonus20: 0,
        cardCountBonus21: 0,
        motoTrophyCount: 0,
        totalPointsKept: 0
      };

      for (const [key, defaultValue] of Object.entries(defaults)) {
        if (stats[key] === undefined) {
          updateObj.$set[key] = defaultValue;
          needsUpdate = true;
        }
      }

      // Update modeStats keys to camelCase
      if (stats.modeStats) {
        const newModeStats = {};
        const keyMappings = {
          'two-hands': 'twoHands',
          'three-hands': 'threeHands',
          'four-hands': 'fourHands'
        };

        for (const [oldKey, newKey] of Object.entries(keyMappings)) {
          if (stats.modeStats[oldKey]) {
            newModeStats[newKey] = stats.modeStats[oldKey];
            updateObj.$unset[`modeStats.${oldKey}`] = '';
            needsUpdate = true;
          }
        }

        // Set new camelCase keys
        if (Object.keys(newModeStats).length > 0) {
          for (const [key, value] of Object.entries(newModeStats)) {
            updateObj.$set[`modeStats.${key}`] = value;
          }
        }
      }

      // Ensure all modeStats have defaults
      const requiredModes = ['twoHands', 'threeHands', 'fourHands', 'party', 'freeforall', 'tournament'];
      for (const mode of requiredModes) {
        if (!stats.modeStats?.[mode]) {
          updateObj.$set[`modeStats.${mode}`] = { games: 0, wins: 0, losses: 0 };
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await collection.updateOne({ _id: stats._id }, updateObj);
        updatedCount++;
      }
    }

    console.log(`[Migration] ✅ Migration completed:`);
    console.log(`  - Updated ${updatedCount} documents`);
    console.log(`  - Removed 'spadesPointsKept' from ${removedFieldCount} documents`);
    console.log(`  - Added missing defaults and camelCase modeStats keys`);

  } catch (error) {
    console.error('[Migration] ❌ Migration failed:', error);
  } finally {
    await client.close();
  }
}

// Run if called directly
if (require.main === module) {
  migrateGameStats().catch(console.error);
}

module.exports = { migrateGameStats };