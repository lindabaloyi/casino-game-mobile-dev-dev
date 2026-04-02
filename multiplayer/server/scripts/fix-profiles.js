/**
 * Migration Script: Fix Player Profiles
 * 
 * This script fixes existing player profiles that have:
 * - null avatar (sets to 'lion')
 * - Remove displayName field
 * 
 * Usage: node scripts/fix-profiles.js
 */

const db = require('../db/connection');

async function fixProfiles() {
  console.log('[Migration] Starting profile fix...');
  
  try {
    const database = await db.getDb();
    
    // Get all profiles with null avatar
    const nullAvatarProfiles = await database.collection('playerProfiles')
      .find({ avatar: null })
      .toArray();
    
    console.log(`[Migration] Found ${nullAvatarProfiles.length} profiles with null avatar`);
    
    let updated = 0;
    
    for (const profile of nullAvatarProfiles) {
      // Try to get the username from the User collection
      let newAvatar = 'lion';

      try {
        const user = await database.collection('users').findOne(
          { _id: profile.userId }
        );

        if (user && user.username) {
          // No displayName to set
        }
      } catch (err) {
        console.log(`[Migration] Could not find user for profile ${profile._id}:`, err.message);
      }
      
      // Update the profile
      await database.collection('playerProfiles').updateOne(
        { _id: profile._id },
        {
          $unset: { displayName: 1 },
          $set: {
            avatar: newAvatar,
            updatedAt: new Date()
          }
        }
      );
      
      console.log(`[Migration] Updated profile ${profile._id}: removed displayName, avatar: ${newAvatar}`);
      updated++;
    }
    
    console.log(`[Migration] Successfully updated ${updated} profiles!`);
    
  } catch (error) {
    console.error('[Migration] Error fixing profiles:', error);
  }
  
  process.exit(0);
}

fixProfiles();
