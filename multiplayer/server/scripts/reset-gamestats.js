/**
 * reset-gamestats.js
 * Drops the gameStats collection to start fresh with the new simplified schema
 * 
 * WARNING: This will delete ALL existing game stats data!
 * 
 * Run with: node scripts/reset-gamestats.js
 */

const db = require('../db/connection');

const COLLECTION_NAME = 'gameStats';

async function reset() {
  console.log('[Reset] WARNING: This will delete ALL GameStats data!');
  console.log('[Reset] Starting...');
  
  try {
    const database = await db.getDb();
    
    // Check current count
    const count = await database.collection(COLLECTION_NAME).countDocuments();
    console.log(`[Reset] Found ${count} existing GameStats documents`);
    
    if (count > 0) {
      // Drop the collection
      await database.collection(COLLECTION_NAME).drop();
      console.log('[Reset] Collection dropped successfully');
    } else {
      console.log('[Reset] Collection is already empty');
    }
    
    console.log('[Reset] GameStats collection has been reset');
    console.log('[Reset] New users will get the simplified 4-field schema');
    console.log('[Reset] Done!');
    
  } catch (error) {
    // Collection might not exist, which is fine for our purposes
    if (error.codeName === 'NamespaceNotFound') {
      console.log('[Reset] Collection does not exist - already fresh');
    } else {
      console.error('[Reset] Error:', error.message);
    }
  }
  
  process.exit(0);
}

reset();
