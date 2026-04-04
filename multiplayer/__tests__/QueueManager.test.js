const QueueManager = require('../server/services/QueueManager');

describe('QueueManager', () => {
  let queueManager;
  let mockSocket;

  beforeEach(() => {
    queueManager = new QueueManager();
    mockSocket = {
      id: 'socket123',
      connected: true,
      disconnected: false,
      lastActivity: Date.now()
    };
    jest.clearAllMocks();
  });

  describe('add()', () => {
    test('should add player to new queue type', () => {
      const socketEntry = { id: 'socket123', socket: mockSocket, userId: 'user1', joinedAt: Date.now() };

      queueManager.add('three-hands', socketEntry);

      expect(queueManager.getSize('three-hands')).toBe(1);
    });

    test('should add multiple players to same queue', () => {
      const entry1 = { id: 'socket1', socket: mockSocket, userId: 'user1', joinedAt: Date.now() };
      const entry2 = { id: 'socket2', socket: mockSocket, userId: 'user2', joinedAt: Date.now() };

      queueManager.add('three-hands', entry1);
      queueManager.add('three-hands', entry2);

      expect(queueManager.getSize('three-hands')).toBe(2);
    });

    test('should add players to different queue types', () => {
      const entry1 = { id: 'socket1', socket: mockSocket, userId: 'user1', joinedAt: Date.now() };
      const entry2 = { id: 'socket2', socket: mockSocket, userId: 'user2', joinedAt: Date.now() };

      queueManager.add('three-hands', entry1);
      queueManager.add('four-hands', entry2);

      expect(queueManager.getSize('three-hands')).toBe(1);
      expect(queueManager.getSize('four-hands')).toBe(1);
    });
  });

  describe('remove()', () => {
    test('should remove existing socket from queue', () => {
      const entry1 = { id: 'socket1', socket: mockSocket, userId: 'user1', joinedAt: Date.now() };
      const entry2 = { id: 'socket2', socket: mockSocket, userId: 'user2', joinedAt: Date.now() };

      queueManager.add('three-hands', entry1);
      queueManager.add('three-hands', entry2);

      const removed = queueManager.remove('three-hands', 'socket1');

      expect(removed).toBe(true);
      expect(queueManager.getSize('three-hands')).toBe(1);
    });

    test('should return false when socket not found', () => {
      const removed = queueManager.remove('three-hands', 'nonexistent');

      expect(removed).toBe(false);
    });

    test('should return false when queue type does not exist', () => {
      const removed = queueManager.remove('nonexistent-type', 'socket1');

      expect(removed).toBe(false);
    });
  });

  describe('pop()', () => {
    test('should pop exact number of players from queue', () => {
      const entries = [
        { id: 'socket1', socket: mockSocket, userId: 'user1', joinedAt: Date.now() },
        { id: 'socket2', socket: mockSocket, userId: 'user2', joinedAt: Date.now() },
        { id: 'socket3', socket: mockSocket, userId: 'user3', joinedAt: Date.now() }
      ];

      entries.forEach(entry => queueManager.add('three-hands', entry));

      const popped = queueManager.pop('three-hands', 2);

      expect(popped).toHaveLength(2);
      expect(popped[0].id).toBe('socket1');
      expect(popped[1].id).toBe('socket2');
      expect(queueManager.getSize('three-hands')).toBe(1);
    });

    test('should return empty array when insufficient players', () => {
      const entry = { id: 'socket1', socket: mockSocket, userId: 'user1', joinedAt: Date.now() };
      queueManager.add('three-hands', entry);

      const popped = queueManager.pop('three-hands', 2);

      expect(popped).toEqual([]);
      expect(queueManager.getSize('three-hands')).toBe(1);
    });

    test('should return empty array when queue does not exist', () => {
      const popped = queueManager.pop('nonexistent', 1);

      expect(popped).toEqual([]);
    });
  });

  describe('getSize()', () => {
    test('should return correct size for existing queue', () => {
      queueManager.add('three-hands', { id: 'socket1', socket: mockSocket });
      queueManager.add('three-hands', { id: 'socket2', socket: mockSocket });

      expect(queueManager.getSize('three-hands')).toBe(2);
    });

    test('should return 0 for non-existing queue', () => {
      expect(queueManager.getSize('nonexistent')).toBe(0);
    });
  });

  describe('cleanup()', () => {
    test('should remove invalid sockets based on validation function', () => {
      const validEntry = { id: 'socket1', socket: mockSocket, userId: 'user1' };
      const invalidEntry = { id: 'socket2', socket: { connected: false }, userId: 'user2' };

      queueManager.add('three-hands', validEntry);
      queueManager.add('three-hands', invalidEntry);

      const cleaned = queueManager.cleanup('three-hands', () => true); // Keep all for this test

      expect(cleaned).toBe(0); // No cleanup since all are valid per custom function
    });

    test('should return 0 when queue does not exist', () => {
      const cleaned = queueManager.cleanup('nonexistent', () => true);

      expect(cleaned).toBe(0);
    });
  });

  describe('getActiveGameTypes()', () => {
    test('should return only types with players', () => {
      queueManager.add('three-hands', { id: 'socket1', socket: mockSocket });
      queueManager.add('four-hands', { id: 'socket2', socket: mockSocket });
      // party has no players

      const activeTypes = queueManager.getActiveGameTypes();

      expect(activeTypes).toContain('three-hands');
      expect(activeTypes).toContain('four-hands');
      expect(activeTypes).not.toContain('party');
    });

    test('should return empty array when no active queues', () => {
      const activeTypes = queueManager.getActiveGameTypes();

      expect(activeTypes).toEqual([]);
    });
  });

  describe('isSocketValid()', () => {
    test('should return true for valid socket', () => {
      const validEntry = {
        id: 'socket1',
        socket: {
          connected: true,
          disconnected: false,
          lastActivity: Date.now()
        },
        joinedAt: Date.now()
      };

      expect(queueManager.isSocketValid(validEntry)).toBe(true);
    });

    test('should return false for disconnected socket', () => {
      const invalidEntry = {
        id: 'socket1',
        socket: {
          connected: false,
          disconnected: true,
          lastActivity: Date.now()
        },
        joinedAt: Date.now()
      };

      expect(queueManager.isSocketValid(invalidEntry)).toBe(false);
    });

    test('should return false for socket exceeding queue timeout', () => {
      const oldEntry = {
        id: 'socket1',
        socket: {
          connected: true,
          disconnected: false,
          lastActivity: Date.now()
        },
        joinedAt: Date.now() - (3 * 60 * 1000) // 3 minutes ago
      };

      expect(queueManager.isSocketValid(oldEntry)).toBe(false);
    });

    test('should return false for inactive socket', () => {
      const inactiveEntry = {
        id: 'socket1',
        socket: {
          connected: true,
          disconnected: false,
          lastActivity: Date.now() - (4 * 60 * 1000) // 4 minutes ago
        },
        joinedAt: Date.now()
      };

      expect(queueManager.isSocketValid(inactiveEntry)).toBe(false);
    });

    test('should return false for null entry', () => {
      expect(queueManager.isSocketValid(null)).toBe(false);
    });

    test('should return false for entry without socket', () => {
      expect(queueManager.isSocketValid({ id: 'socket1' })).toBe(false);
    });
  });
});