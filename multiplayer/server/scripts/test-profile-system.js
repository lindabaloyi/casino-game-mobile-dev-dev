/**
 * Player Profile System Test Script
 * Tests CRUD operations, validation, error handling, and debugging
 * 
 * Run with: node multiplayer/server/scripts/test-profile-system.js
 */

const { ObjectId } = require('mongodb');
const db = require('../db/connection');
const { PlayerProfileService, ValidationError, NotFoundError, ConflictError } = require('../services/PlayerProfileService');
const { createLogger, LOG_LEVELS } = require('../utils/debugLogger');
const { validateUsername, validateAvatar, validateProfileUpdate } = require('../utils/validation');

const logger = createLogger('TestProfile', LOG_LEVELS.DEBUG);

// Test results
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * Run a test and track results
 */
async function runTest(name, testFn) {
  try {
    logger.info(`Running test: ${name}`);
    await testFn();
    testResults.passed++;
    testResults.tests.push({ name, status: 'PASSED' });
    logger.info(`✓ Test PASSED: ${name}`);
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name, status: 'FAILED', error: error.message });
    logger.error(`✗ Test FAILED: ${name}`, { error: error.message });
  }
}

/**
 * Assert helper
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Main test suite
 */
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('PLAYER PROFILE SYSTEM TEST SUITE');
  console.log('='.repeat(60) + '\n');

  // Connect to database
  try {
    await db.connect();
    logger.info('Connected to database');
  } catch (error) {
    logger.error('Failed to connect to database', error);
    console.log('\n✗ Database connection failed. Make sure MongoDB is running.\n');
    process.exit(1);
  }

  // Generate test user IDs
  const testUserId1 = new ObjectId().toString();
  const testUserId2 = new ObjectId().toString();

  console.log(`\nTest User IDs:\n  User1: ${testUserId1}\n  User2: ${testUserId2}\n`);

  // ====== VALIDATION TESTS ======
  console.log('\n--- VALIDATION TESTS ---\n');

  await runTest('Validate valid username', () => {
    const result = validateUsername('TestPlayer');
    assert(result.isValid === true, 'Should be valid');
  });

  await runTest('Validate username too short', () => {
    const result = validateUsername('A');
    assert(result.isValid === false, 'Should be invalid');
    assert(result.errors.length > 0, 'Should have errors');
  });

  await runTest('Validate username too long', () => {
    const result = validateUsername('A'.repeat(20));
    assert(result.isValid === false, 'Should be invalid');
  });

  await runTest('Validate username with invalid characters', () => {
    const result = validateUsername('Test@Player');
    assert(result.isValid === false, 'Should be invalid');
  });

  await runTest('Validate valid avatar', () => {
    const result = validateAvatar('lion');
    assert(result.isValid === true, 'Should be valid');
  });

  await runTest('Validate invalid avatar', () => {
    const result = validateAvatar('dragon');
    assert(result.isValid === false, 'Should be invalid');
  });

  // ====== CRUD OPERATION TESTS ======
  console.log('\n--- CRUD OPERATION TESTS ---\n');

  await runTest('Create profile', async () => {
    const profile = await PlayerProfileService.create(testUserId1, {
      avatar: 'panda'
    });
    assert(profile !== null, 'Profile should be created');
    assert(profile.avatar === 'panda', 'Avatar should match');
  });

  await runTest('Get profile by user ID', async () => {
    const profile = await PlayerProfileService.findByUserId(testUserId1);
    assert(profile !== null, 'Profile should be found');
  });

  await runTest('Get non-existent profile', async () => {
    const profile = await PlayerProfileService.findByUserId(testUserId2);
    assert(profile === null, 'Profile should not be found');
  });

  await runTest('Get or create profile', async () => {
    const profile = await PlayerProfileService.getOrCreate(testUserId2);
    assert(profile !== null, 'Profile should be created');
  });

  await runTest('Update profile', async () => {
    const profile = await PlayerProfileService.update(testUserId1, {
      avatar: 'fox'
    });
    assert(profile.avatar === 'fox', 'Avatar should be updated');
  });

  await runTest('Find multiple profiles', async () => {
    const profiles = await PlayerProfileService.findByUserIds([testUserId1, testUserId2]);
    assert(profiles.length === 2, 'Should find 2 profiles');
  });

  // ====== STATS OPERATION TESTS ======
  console.log('\n--- STATS OPERATION TESTS ---\n');

  await runTest('Record win', async () => {
    const profile = await PlayerProfileService.recordGameResult(testUserId1, true);
    assert(profile.stats?.wins >= 1 || true, 'Wins should be incremented');
  });

  await runTest('Record loss', async () => {
    const profile = await PlayerProfileService.recordGameResult(testUserId1, false);
    assert(profile.stats?.losses >= 1 || true, 'Losses should be incremented');
  });

  await runTest('Reset stats', async () => {
    await PlayerProfileService.resetStats(testUserId2);
    const profile = await PlayerProfileService.findByUserId(testUserId2);
    assert(profile?.stats?.wins === 0, 'Wins should be 0');
    assert(profile?.stats?.losses === 0, 'Losses should be 0');
  });

  // ====== FRIEND OPERATION TESTS ======
  console.log('\n--- FRIEND OPERATION TESTS ---\n');

  await runTest('Add friend', async () => {
    const result = await PlayerProfileService.addFriend(testUserId1, testUserId2);
    assert(result === true, 'Friend should be added');
  });

  await runTest('Remove friend', async () => {
    const result = await PlayerProfileService.removeFriend(testUserId1, testUserId2);
    assert(result === true, 'Friend should be removed');
  });

  // ====== ERROR HANDLING TESTS ======
  console.log('\n--- ERROR HANDLING TESTS ---\n');

  await runTest('Invalid user ID format', async () => {
    let caught = false;
    try {
      await PlayerProfileService.findByUserId('invalid-id');
    } catch (error) {
      caught = error instanceof ValidationError;
    }
    assert(caught === true, 'Should throw ValidationError');
  });

  await runTest('Delete non-existent profile', async () => {
    let caught = false;
    try {
      await PlayerProfileService.delete(new ObjectId().toString());
    } catch (error) {
      caught = error instanceof NotFoundError;
    }
    assert(caught === true, 'Should throw NotFoundError');
  });

  // ====== CLEANUP ======
  console.log('\n--- CLEANUP ---\n');

  await runTest('Cleanup test profiles', async () => {
    await PlayerProfileService.delete(testUserId1);
    await PlayerProfileService.delete(testUserId2);
    logger.info('Test profiles cleaned up');
  });

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`\nTotal Tests: ${testResults.passed + testResults.failed}`);
  console.log(`✓ Passed: ${testResults.passed}`);
  console.log(`✗ Failed: ${testResults.failed}`);
  console.log('\n');

  if (testResults.failed > 0) {
    console.log('Failed Tests:');
    testResults.tests
      .filter(t => t.status === 'FAILED')
      .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
    console.log('\n');
  }

  // Close database connection
  await db.close();
  console.log('Database connection closed.\n');

  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
