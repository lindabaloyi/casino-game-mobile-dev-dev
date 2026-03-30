/**
 * Database Migration: Add modeStats to existing GameStats
 * 
 * This script adds the modeStats field to existing game stats documents
 * that don't have it (legacy data).
 * 
 * Usage: node migrate-add-mode-stats.js
 */

const db = require('./db/connection');

const DEFAULT_MODE_STATS = {
  'two-hands': { games: 0, wins: 0, losses: 0 },
  'three-hands': { games: 0, wins: 0, losses: 0 },
  'four-hands': { games: 0, wins: 0, losses: 0 },
  'party': { games: 0, wins: 0, losses: 0 },
  'freeforall': { games: 0, wins: 0, losses: 0 },
  'tournament': { games: 0, wins: 0, losses: 0 }
};

async function migrate() {
  console.log('[Migration] Starting modeStats migration...');
  
  try {
    const database = await db.getDb();
    const collection = database.collection('gameStats');
    
    // Find documents missing modeStats
    const count = await collection.countDocuments({ modeStats: { $exists: false } });
    console.log(`[Migration] Found ${count} documents without modeStats`);
    
    if (count === 0) {
      console.log('[Migration] No documents to migrate. Exiting.');
      process.exit(0);
    }
    
    // Update all documents
    const result = await collection.updateMany(
      { modeStats: { $exists: false } },
      { 
        $set: { modeStats: DEFAULT_MODE_STATS }
      }
    );
    
    console.log(`[Migration] ✅ Successfully migrated ${result.modifiedCount} documents`);
    
    // Verify migration
    const remaining = await collection.countDocuments({ modeStats: { $exists: false } });
    console.log(`[Migration] Remaining documents without modeStats: ${remaining}`);
    
    if (remaining === 0) {
      console.log('[Migration] ✅ Migration complete!');
    } else {
      console.log(`[Migration] ⚠️ ${remaining} documents still need migration`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('[Migration] ❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  migrate();
}

module.exports = migrate;