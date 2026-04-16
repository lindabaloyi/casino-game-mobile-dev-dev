/**
 * Mock Socket.IO for RoomService unit tests
 */

const sockets = new Map();

const createMockSocket = (id, userId) => ({
  id,
  userId,
  username: null,
  avatar: null,
  connected: true,
  emit: jest.fn(),
  join: jest.fn(),
  leave: jest.fn(),
  to: function() {
    return {
      emit: jest.fn(),
    };
  },
});

const MockIO = function() {
  this.sockets = new Map();
};

MockIO.prototype._reset = function() {
  this.sockets.clear();
};

MockIO.prototype.addSocket = function(id, userId) {
  const socket = createMockSocket(id, userId);
  this.sockets.set(id, socket);
  return socket;
};

MockIO.prototype.removeSocket = function(id) {
  this.sockets.delete(id);
};

MockIO.prototype.getSocket = function(id) {
  return this.sockets.get(id) || null;
};

MockIO.prototype.getSocketIds = function() {
  return Array.from(this.sockets.keys());
};

MockIO.prototype.sockets = {
  sockets: new Map(),
  get: function(id) {
    return this.sockets.get(id);
  },
};

MockIO.prototype.to = function(roomId) {
  const self = this;
  return {
    emit: function(event, data) {
      // Broadcast to all sockets in room
      for (const socket of self.sockets.values()) {
        socket.emit(event, data);
      }
    },
  };
};

MockIO.prototype.in = function(roomId) {
  return this.to(roomId);
};

MockIO.prototype.emit = jest.fn();

module.exports = { MockIO, createMockSocket };