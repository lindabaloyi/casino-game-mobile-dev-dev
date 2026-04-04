const CleanupScheduler = require('../server/services/CleanupScheduler');

describe('CleanupScheduler', () => {
  let cleanupScheduler;
  let mockQueueManager;
  let mockSocketRegistry;
  let mockIo;

  beforeEach(() => {
    mockQueueManager = {
      getActiveGameTypes: jest.fn().mockReturnValue([]),
      cleanup: jest.fn(),
      isSocketValid: jest.fn(),
      getSize: jest.fn()
    };

    mockSocketRegistry = {
      getStats: jest.fn().mockReturnValue({
        totalSockets: 0,
        activeGames: 0,
        gameSocketCounts: []
      })
    };

    mockIo = {};

    cleanupScheduler = new CleanupScheduler(mockQueueManager, mockSocketRegistry, mockIo);
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    cleanupScheduler.stop();
    jest.clearAllTimers();
  });

  describe('start()', () => {
    test('should start periodic cleanup', () => {
      cleanupScheduler.start();

      expect(cleanupScheduler.intervalId).not.toBeNull();

      // Fast-forward time
      jest.advanceTimersByTime(10000);

      expect(mockQueueManager.getActiveGameTypes).toHaveBeenCalled();
    });

    test('should not start multiple intervals', () => {
      cleanupScheduler.start();
      expect(cleanupScheduler.intervalId).not.toBeNull();

      cleanupScheduler.start();

      expect(cleanupScheduler.intervalId).not.toBeNull();
    });
  });

  describe('stop()', () => {
    test('should stop periodic cleanup', () => {
      cleanupScheduler.start();
      expect(cleanupScheduler.intervalId).not.toBeNull();

      cleanupScheduler.stop();

      expect(cleanupScheduler.intervalId).toBeNull();
    });

    test('should handle stop when not started', () => {
      cleanupScheduler.stop();

      expect(cleanupScheduler.intervalId).toBeNull();
    });
  });

  describe('runCleanup()', () => {
    test('should clean up all active game types', () => {
      mockQueueManager.getActiveGameTypes.mockReturnValue(['three-hands', 'four-hands']);
      mockQueueManager.cleanup.mockReturnValue(2);
      mockQueueManager.getSize.mockReturnValue(5);
      mockSocketRegistry.getStats.mockReturnValue({
        totalSockets: 10,
        activeGames: 3,
        gameSocketCounts: []
      });

      cleanupScheduler.runCleanup();

      expect(mockQueueManager.getActiveGameTypes).toHaveBeenCalled();
      expect(mockQueueManager.cleanup).toHaveBeenCalledTimes(2);
      expect(mockQueueManager.cleanup).toHaveBeenCalledWith('three-hands', expect.any(Function));
      expect(mockQueueManager.cleanup).toHaveBeenCalledWith('four-hands', expect.any(Function));
      expect(mockSocketRegistry.getStats).toHaveBeenCalled();
    });

    test('should handle empty active game types', () => {
      mockQueueManager.getActiveGameTypes.mockReturnValue([]);
      mockSocketRegistry.getStats.mockReturnValue({
        totalSockets: 0,
        activeGames: 0,
        gameSocketCounts: []
      });

      cleanupScheduler.runCleanup();

      expect(mockQueueManager.getActiveGameTypes).toHaveBeenCalled();
      expect(mockQueueManager.cleanup).not.toHaveBeenCalled();
      expect(mockSocketRegistry.getStats).toHaveBeenCalled();
    });

    test('should use queueManager.isSocketValid for cleanup validation', () => {
      mockQueueManager.getActiveGameTypes.mockReturnValue(['three-hands']);
      mockQueueManager.cleanup.mockImplementation((gameType, validator) => {
        // Call the validator function
        validator({ id: 'socket1', socket: { connected: true } });
        return 1;
      });

      cleanupScheduler.runCleanup();

      expect(mockQueueManager.isSocketValid).toHaveBeenCalledWith({ id: 'socket1', socket: { connected: true } });
    });

    test('should handle no active game types', () => {
      mockQueueManager.getActiveGameTypes.mockReturnValue([]);
      mockSocketRegistry.getStats.mockReturnValue({
        totalSockets: 0,
        activeGames: 0,
        gameSocketCounts: []
      });

      cleanupScheduler.runCleanup();

      expect(mockQueueManager.cleanup).not.toHaveBeenCalled();
    });
  });

  describe('setInterval()', () => {
    test('should update interval when not running', () => {
      cleanupScheduler.setInterval(20000);

      expect(cleanupScheduler.intervalMs).toBe(20000);
    });

    test('should restart with new interval when running', () => {
      cleanupScheduler.start();
      expect(cleanupScheduler.intervalId).not.toBeNull();

      cleanupScheduler.setInterval(20000);

      expect(cleanupScheduler.intervalMs).toBe(20000);
      // Interval should be restarted (different ID)
      expect(cleanupScheduler.intervalId).not.toBeNull();
    });
  });

  describe('integration with timers', () => {
    test('should run cleanup periodically', () => {
      mockQueueManager.getActiveGameTypes.mockReturnValue(['three-hands']);
      mockQueueManager.cleanup.mockReturnValue(0);
      mockQueueManager.getSize.mockReturnValue(3);
      mockSocketRegistry.getStats.mockReturnValue({
        totalSockets: 6,
        activeGames: 2,
        gameSocketCounts: []
      });

      cleanupScheduler.start();

      // Should not have run yet
      expect(mockQueueManager.getActiveGameTypes).not.toHaveBeenCalled();

      // Advance time by interval
      jest.advanceTimersByTime(10000);

      expect(mockQueueManager.getActiveGameTypes).toHaveBeenCalledTimes(1);

      // Advance again
      jest.advanceTimersByTime(10000);

      expect(mockQueueManager.getActiveGameTypes).toHaveBeenCalledTimes(2);
    });
  });
});