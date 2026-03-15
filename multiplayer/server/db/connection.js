/**
 * MongoDB Connection Utility
 * Manages connection to MongoDB Atlas database
 */

const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb+srv://lindabaloyi10_db_user:ZJYvwn0VQT86uROc@casinodotzadb.zsvno3e.mongodb.net/?appName=casinodotzaDB';
const dbName = process.env.MONGODB_DB_NAME || 'casinodotza';

let client = null;
let db = null;

/**
 * Connect to MongoDB
 * @returns {Promise<Db>} The database instance
 */
async function connect() {
  if (db) {
    console.log('[MongoDB] Already connected to database');
    return db;
  }

  try {
    console.log('[MongoDB] Connecting to database...');
    
    // Try different connection options for better TLS compatibility
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 60000,
      retryWrites: true,
      retryReads: true,
    };
    
    client = new MongoClient(uri, options);
    
    await client.connect();
    db = client.db(dbName);
    
    console.log(`[MongoDB] Connected to database: ${dbName}`);
    
    // Create indexes
    await createIndexes(db);
    
    return db;
  } catch (error) {
    console.error('[MongoDB] Connection error:', error);
    throw error;
  }
}

/**
 * Create database indexes for better performance
 * @param {Db} database - The database instance
 */
async function createIndexes(database) {
  try {
    // Users collection indexes
    await database.collection('users').createIndex(
      { email: 1 }, 
      { unique: true }
    );
    await database.collection('users').createIndex(
      { username: 1 }, 
      { unique: true }
    );
    
    // PlayerProfiles collection indexes
    await database.collection('playerProfiles').createIndex(
      { userId: 1 }, 
      { unique: true }
    );
    
    // FriendRequests collection indexes
    await database.collection('friendRequests').createIndex(
      { fromUserId: 1, toUserId: 1 },
      { unique: true }
    );
    await database.collection('friendRequests').createIndex(
      { toUserId: 1, status: 1 }
    );
    
    // GameStats collection indexes
    await database.collection('gameStats').createIndex(
      { userId: 1 }, 
      { unique: true }
    );
    await database.collection('gameStats').createIndex(
      { totalGames: -1 }
    );
    
    // GameStates collection indexes
    await database.collection('gameStates').createIndex(
      { roomId: 1 }, 
      { unique: true }
    );
    await database.collection('gameStates').createIndex(
      { lastUpdated: 1 }, 
      { expireAfterSeconds: 3600 } // Auto-delete after 1 hour
    );
    
    console.log('[MongoDB] Indexes created successfully');
  } catch (error) {
    console.error('[MongoDB] Index creation error:', error);
  }
}

/**
 * Get the database instance
 * @returns {Promise<Db>} The database instance
 */
async function getDb() {
  if (!db) {
    await connect();
  }
  return db;
}

/**
 * Close the database connection
 */
async function close() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('[MongoDB] Connection closed');
  }
}

/**
 * Check if connected to MongoDB
 * @returns {boolean} Connection status
 */
function isConnected() {
  return db !== null;
}

module.exports = {
  connect,
  getDb,
  close,
  isConnected,
};
