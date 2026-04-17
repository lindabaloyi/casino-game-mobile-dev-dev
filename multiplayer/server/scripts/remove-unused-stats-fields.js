/**
 * Migration script to remove unused stats fields from GameStats documents
 * Removes: acesKept, tenDiamondsKept, twoSpadesKept, spadesCountKept,
 *          spadesBonusCount, cardCountBonus20, cardCountBonus21
 */

const { MongoClient } = require('mongodb');

async function migrateGameStats() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://lindabaloyi10_db_user:ZJYvwn0VQT86uROc@casinodotzadb.zsvno3e.mongodb.net/?appName=casinodotzaDB';
  const dbName = process.env.MONGODB_DB_NAME || 'casinodotza';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('gameStats');

    console.log('[Migration] Starting GameStats cleanup...');

    const fieldsToRemove = [
      'acesKept',
      'tenDiamondsKept',
      'twoSpadesKept',
      'spadesCountKept',
      'spadesBonusCount',
      'cardCountBonus20',
      'cardCountBonus21'
    ];

    const updateObj = { $unset: {} };
    fieldsToRemove.forEach(field => {
      updateObj.$unset[field] = '';
    });

    const result = await collection.updateMany(
      {},
      updateObj
    );

    console.log(`[Migration] ✅ Removed unused fields from ${result.modifiedCount} documents`);
    
    await client.close();
    process.exit(0);
  } catch (error) {
    console.error('[Migration] ❌ Error:', error.message);
    await client.close();
    process.exit(1);
  }
}

migrateGameStats();