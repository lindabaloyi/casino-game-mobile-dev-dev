/**
 * Migration script to rename motoTrophyCount to motorAchievementCount
 */

const { MongoClient } = require('mongodb');

async function migrate() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://lindabaloyi10_db_user:ZJYvwn0VQT86uROc@casinodotzadb.zsvno3e.mongodb.net/?appName=casinodotzaDB';
  const dbName = process.env.MONGODB_DB_NAME || 'casinodotza';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('gameStats');

    console.log('[Migration] Renaming motoTrophyCount → motorAchievementCount...');

    const result = await collection.updateMany(
      {},
      { $rename: { motoTrophyCount: 'motorAchievementCount' } }
    );

    console.log(`[Migration] ✅ Renamed field in ${result.modifiedCount} documents`);
    
    await client.close();
    process.exit(0);
  } catch (error) {
    console.error('[Migration] ❌ Error:', error.message);
    await client.close();
    process.exit(1);
  }
}

migrate();