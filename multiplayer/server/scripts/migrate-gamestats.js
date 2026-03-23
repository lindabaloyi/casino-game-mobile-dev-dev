/**
 * migrate-gamestats.js
 * Migration script to simplify GameStats documents to the new schema
 * 
 * Removes old fields: highestScore, achievements, totalScore, currentStreak, 
 * bestStreak, lastTenGames, etc.
 * 
 * Run with: node scripts/migrate-gamestats.js
 */

const { ObjectId } = require('mongodb');
const db = require('../db/connection');

const COLLECTION_NAME = 'gameStats';

// Fields to remove from old documents
const FIELDS_TO_REMOVE = [
  'highestScore',
  'achievements', 
  'totalScore',
  'currentStreak',
  'bestStreak',
  'lastTenGames',
  'tournamentWins',
  'tournamentLosses',
  'gamesThisWeek',
  'gamesThisMonth',
  'winsThisWeek',
  'winsThisMonth',
  'captureCount',
  'buildCount',
  'tripleSevenCount',
  'tenDiamondsCount'
];

async function migrate() {
  console.log('[Migration] Starting GameStats migration...');
  
  try {
    const database = await db.getDb();
    
    // Find all GameStats documents
    const allStats = await database.collection(COLLECTION_NAME).find({}).toArray();
    console.log(`[Migration] Found ${allStats.length} GameStats documents`);
    
    if (allStats.length === 0) {
      console.log('[Migration] No documents to migrate');
      return;
    }
    
    let migrated = 0;
    let skipped = 0;
    
    for (const stat of allStats) {
      // Check if document already has the simplified format
      // (no extra fields that need removal)
      const hasExtraFields = FIELDS_TO_REMOVE.some(field => field in stat);
      
      if (hasExtraFields) {
        // Build the update operation to remove old fields
        const updateFields = {};
        FIELDS_TO_REMOVE.forEach(field => {
          if (field in stat) {
            updateFields[field] = '';
          }
        });
        
        // Use $unset to remove fields
        const unsetFields = {};
        FIELDS_TO_REMOVE.forEach(field => {
          if (field in stat) {
            unsetFields[field] = 1;
          }
        });
        
        await database.collection(COLLECTION_NAME).updateOne(
          { _id: stat._id },
          { $unset: unsetFields }
        );
        
        migrated++;
      } else {
        skipped++;
      }
    }
    
    console.log(`[Migration] Complete: ${migrated} migrated, ${skipped} already simplified`);
    
    // Show sample of migrated document
    const sample = await database.collection(COLLECTION_NAME).findOne({});
    console.log('[Migration] Sample document after migration:');
    console.log({
      _id: sample._id,
      userId: sample.userId,
      totalGames: sample.totalGames,
      wins: sample.wins,
      losses: sample.losses,
      createdAt: sample.createdAt,
      updatedAt: sample.updatedAt
    });
    
  } catch (error) {
    console.error('[Migration] Error:', error);
  }
  
  process.exit(0);
}

// Run migration
migrate();
