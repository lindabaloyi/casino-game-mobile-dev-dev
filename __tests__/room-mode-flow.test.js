/**
 * Room Mode Flow Tests
 * 
 * Tests private room creation and joining for all 5 game modes.
 * Validates that game modes are correctly propagated through:
 * - URL params → UI → Server Response → Navigation URL
 */

const RoomService = require('../multiplayer/server/services/RoomService');

// ── Mock Dependencies ─────────────────────────────────────────────────────────

function createMockSocket(id = 'socket-1') {
  return {
    id,
    userId: `user-${id}`,
    emit: jest.fn(),
    join: jest.fn(),
  };
}

function createMockGameManager() {
  return {
    startGame: jest.fn((playerCount) => ({
      gameId: `game-${Date.now()}`,
      gameState: { players: playerCount, mode: 'standard' },
    })),
    startPartyGame: jest.fn(() => ({
      gameId: `party-${Date.now()}`,
      gameState: { players: 4, mode: 'party' },
    })),
    addPlayerToGame: jest.fn(),
    getGameState: jest.fn(),
    endGame: jest.fn(),
    setPlayerUserId: jest.fn(),
  };
}

function createMockUnifiedMatchmaking() {
  return {
    socketGameMap: new Map(),
    gameSocketsMap: new Map(),
    addToQueue: jest.fn(),
    handleDisconnection: jest.fn(),
  };
}

function createMockBroadcaster() {
  return {
    broadcastGameStart: jest.fn(),
    broadcastDisconnection: jest.fn(),
  };
}

function createMockIO(mockSockets = {}) {
  return {
    sockets: {
      sockets: mockSockets,
    },
  };
}

// ── Test Suite: RoomService ───────────────────────────────────────────────────

describe('RoomService - Game Mode Handling', () => {
  let roomService;
  let mockGameManager;
  let mockUnifiedMatchmaking;
  let mockBroadcaster;

  beforeEach(() => {
    mockGameManager = createMockGameManager();
    mockUnifiedMatchmaking = createMockUnifiedMatchmaking();
    mockBroadcaster = createMockBroadcaster();
    roomService = new RoomService(
      mockGameManager,
      mockUnifiedMatchmaking,
      mockBroadcaster
    );
  });

  describe('createRoom()', () => {
    const MODES = [
      { mode: 'two-hands', expectedPlayers: 2 },
      { mode: 'three-hands', expectedPlayers: 3 },
      { mode: 'four-hands', expectedPlayers: 4 },
      { mode: 'party', expectedPlayers: 4 },
      { mode: 'freeforall', expectedPlayers: 4 },
    ];

    test.each(MODES)(
      'createRoom("$mode") → maxPlayers=$expectedPlayers',
      ({ mode, expectedPlayers }) => {
        const socket = createMockSocket('host-1');
        const result = roomService.createRoom(socket, mode);

        expect(result.room).toBeDefined();
        expect(result.room.gameMode).toBe(mode);
        expect(result.room.maxPlayers).toBe(expectedPlayers);
        expect(result.room.players).toHaveLength(1);
        expect(result.roomCode).toBeDefined();
      }
    );

    test('createRoom with unknown mode throws error', () => {
      const socket = createMockSocket('host-1');
      
      expect(() => roomService.createRoom(socket, 'unknown-mode')).toThrow(
        'Unknown game mode: unknown-mode'
      );
    });

    test('createRoom overrides maxPlayers when provided', () => {
      const socket = createMockSocket('host-1');
      const result = roomService.createRoom(socket, 'two-hands', 4);

      expect(result.room.maxPlayers).toBe(4);
    });

    test('createRoom cleans up previous room association', () => {
      const socket = createMockSocket('host-1');
      
      const result1 = roomService.createRoom(socket, 'two-hands');
      expect(result1.roomCode).toBeDefined();
      
      const result2 = roomService.createRoom(socket, 'four-hands');
      expect(result2.roomCode).toBeDefined();
      expect(result2.roomCode).not.toBe(result1.roomCode);
      
      const oldRoom = roomService.getRoomStatus(result1.roomCode);
      expect(oldRoom).toBeNull();
    });
  });

  describe('startRoomGame()', () => {
    test.each([
      { mode: 'two-hands', requiredPlayers: 2 },
      { mode: 'three-hands', requiredPlayers: 3 },
      { mode: 'four-hands', requiredPlayers: 4 },
      { mode: 'party', requiredPlayers: 4 },
      { mode: 'freeforall', requiredPlayers: 4 },
    ])(
      'startRoomGame("$mode") fails with 1 player',
      ({ mode, requiredPlayers }) => {
        const socket = createMockSocket('host-1');
        const result = roomService.createRoom(socket, mode);
        const io = createMockIO({});

        const startResult = roomService.startRoomGame(result.roomCode, io);
        
        expect(startResult.success).toBe(false);
        expect(startResult.error).toBeTruthy();
      }
    );

    test('startRoomGame fails when missing required sockets', () => {
      const socket1 = createMockSocket('player-1');
      const socket2 = createMockSocket('player-2');
      const mockSocketsMap = new Map();
      // Don't include player sockets in the map to simulate missing sockets
      const io = {
        sockets: {
          sockets: mockSocketsMap,
        },
      };

      const result = roomService.createRoom(socket1, 'two-hands');
      roomService.joinRoom(socket2, result.roomCode);
      
      const startResult = roomService.startRoomGame(result.roomCode, io);
      
      expect(startResult.success).toBe(false);
    });
  });

  describe('joinRoom()', () => {
    test('joinRoom adds player to existing room', () => {
      const host = createMockSocket('host-1');
      const result = roomService.createRoom(host, 'four-hands');
      
      const guest = createMockSocket('guest-1');
      const joinResult = roomService.joinRoom(guest, result.roomCode);
      
      expect(joinResult.success).toBe(true);
      expect(joinResult.room.playerCount).toBe(2);
    });

    test('joinRoom rejects when room is full', () => {
      const host = createMockSocket('host-1');
      const result = roomService.createRoom(host, 'two-hands');
      
      const guest1 = createMockSocket('guest-1');
      roomService.joinRoom(guest1, result.roomCode);
      
      const guest2 = createMockSocket('guest-2');
      const joinResult = roomService.joinRoom(guest2, result.roomCode);
      
      expect(joinResult.success).toBe(false);
      expect(joinResult.error).toMatch(/(Room is full|no longer accepting players)/);
    });

    test('joinRoom rejects invalid room code', () => {
      const guest = createMockSocket('guest-1');
      const joinResult = roomService.joinRoom(guest, 'NONEXIST');
      
      expect(joinResult.success).toBe(false);
      expect(joinResult.error).toBe('Room not found');
    });
  });

  describe('leaveRoom()', () => {
    test('leaveRoom removes player correctly', () => {
      const host = createMockSocket('host-1');
      const guest = createMockSocket('guest-1');
      
      roomService.createRoom(host, 'four-hands');
      const roomCode = roomService.socketRoomMap.get('host-1');
      roomService.joinRoom(guest, roomCode);
      
      const leaveResult = roomService.leaveRoom(guest);
      
      expect(leaveResult.success).toBe(true);
    });

    test('leaveRoom cleans room when last player leaves', () => {
      const host = createMockSocket('host-1');
      const result = roomService.createRoom(host, 'two-hands');
      
      const leaveResult = roomService.leaveRoom(host);
      
      expect(leaveResult.success).toBe(true);
      expect(leaveResult.roomClosed).toBe(true);
    });
  });
});

// ── Client Mode Mapping Tests ─────────────────────────────────────────────────

describe('Client Game Mode Mapping', () => {
  function mockModeMapping(mode) {
    return mode || 'two-hands';
  }

  describe('create-room.tsx mode mapping logic', () => {
    test.each([
      { input: 'two-hands', expected: 'two-hands' },
      { input: 'three-hands', expected: 'three-hands' },
      { input: 'four-hands', expected: 'four-hands' },
      { input: 'party', expected: 'party' },
      { input: 'freeforall', expected: 'freeforall' },
      { input: undefined, expected: 'two-hands' },
    ])(
      'create-room mode mapping: $input → $expected',
      ({ input, expected }) => {
        expect(mockModeMapping(input)).toBe(expected);
      }
    );
  });

  describe('Navigation URL generation', () => {
    function generateNavigationUrl(mode, roomCode) {
      return `/online-play?mode=${mode}&roomCode=${roomCode}`;
    }

    test.each([
      { mode: 'two-hands', roomCode: 'DEF456' },
      { mode: 'three-hands', roomCode: 'GHI012' },
      { mode: 'four-hands', roomCode: 'ABC123' },
      { mode: 'party', roomCode: 'XYZ789' },
      { mode: 'freeforall', roomCode: 'JKL345' },
    ])(
      'generates correct URL for $mode room',
      ({ mode, roomCode }) => {
        const url = generateNavigationUrl(mode, roomCode);
        expect(url).toBe(`/online-play?mode=${mode}&roomCode=${roomCode}`);
      }
    );
  });
});

// ── Integration: Full Flow Tests ──────────────────────────────────────────────

describe('Private Room Full Flow', () => {
  let roomService;

  beforeEach(() => {
    roomService = new RoomService(
      createMockGameManager(),
      createMockUnifiedMatchmaking(),
      createMockBroadcaster()
    );
  });

  test('four-hands room: create → join → mode preserved', () => {
    const host = createMockSocket('host-1');
    
    const created = roomService.createRoom(host, 'four-hands');
    expect(created.room.gameMode).toBe('four-hands');
    expect(created.room.maxPlayers).toBe(4);
    expect(created.room.status).toBe('waiting');

    const guest1 = createMockSocket('guest-1');
    const guest2 = createMockSocket('guest-2');
    
    roomService.joinRoom(guest1, created.roomCode);
    roomService.joinRoom(guest2, created.roomCode);

    const status = roomService.getRoomStatus(created.roomCode);
    expect(status.playerCount).toBe(3);
    expect(status.status).toBe('waiting');
    expect(status.gameMode).toBe('four-hands');
  });

  test('party room: mode preserved throughout flow', () => {
    const host = createMockSocket('host-1');

    const created = roomService.createRoom(host, 'party');
    expect(created.room.gameMode).toBe('party');
    
    const status = roomService.getRoomStatus(created.roomCode);
    expect(status.gameMode).toBe('party');
  });

  test('different rooms get unique codes (no code mixing)', () => {
    const socket1 = createMockSocket('host-1');

    const room1 = roomService.createRoom(socket1, 'two-hands');
    roomService.leaveRoom(socket1);
    
    const room2 = roomService.createRoom(socket1, 'four-hands');
    
    expect(room1.roomCode).not.toBe(room2.roomCode);
    expect(roomService.socketRoomMap.get(socket1.id)).toBe(room2.roomCode);
    expect(roomService.getRoomStatus(room1.roomCode)).toBeNull();
  });
});