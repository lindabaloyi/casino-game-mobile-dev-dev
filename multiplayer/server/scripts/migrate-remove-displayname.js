/**
 * Database Migration: Remove displayName field from users and playerProfiles collections
 * 
 * This script removes the displayName field from existing documents
 * that still have it (legacy data).
 * 
 * Usage: node migrate-remove-displayname.js
 */

const db = require('../db/connection');

async function migrate() {
  console.log('[Migration] Starting displayName removal migration...');
  
  try {
    const database = await db.getDb();
    
    // Migrate users collection
    const usersCollection = database.collection('users');
    const usersWithDisplayName = await usersCollection.countDocuments({ displayName: { $exists: true } });
    console.log(`[Migration] Found ${usersWithDisplayName} users with displayName field`);
    
    if (usersWithDisplayName > 0) {
      const usersResult = await usersCollection.updateMany(
        { displayName: { $exists: true } },
        { $unset: { displayName: '' } }
      );
      console.log(`[Migration] ✅ Removed displayName from ${usersResult.modifiedCount} users`);
    } else {
      console.log('[Migration] No users with displayName field found');
    }
    
    // Migrate playerProfiles collection
    const profilesCollection = database.collection('playerProfiles');
    const profilesWithDisplayName = await profilesCollection.countDocuments({ displayName: { $exists: true } });
    console.log(`[Migration] Found ${profilesWithDisplayName} playerProfiles with displayName field`);
    
    if (profilesWithDisplayName > 0) {
      const profilesResult = await profilesCollection.updateMany(
        { displayName: { $exists: true } },
        { $unset: { displayName: '' } }
      );
      console.log(`[Migration] ✅ Removed displayName from ${profilesResult.modifiedCount} playerProfiles`);
    } else {
      console.log('[Migration] No playerProfiles with displayName field found');
    }
    
    // Verify migration
    const remainingUsers = await usersCollection.countDocuments({ displayName: { $exists: true } });
    const remainingProfiles = await profilesCollection.countDocuments({ displayName: { $exists: true } });
    
    console.log(`[Migration] Remaining users with displayName: ${remainingUsers}`);
    console.log(`[Migration] Remaining playerProfiles with displayName: ${remainingProfiles}`);
    
    if (remainingUsers === 0 && remainingProfiles === 0) {
      console.log('[Migration] ✅ Migration complete! All displayName fields removed.');
    } else {
      console.log('[Migration] ⚠️ Some documents still have displayName field');
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