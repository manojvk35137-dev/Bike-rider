
import { createServer } from "node:http";
import { Server } from "socket.io";

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const MAX_PLAYERS = 4;

// Temporary in-memory data; resets when the server restarts.
const users = new Map(); // username -> socket ID
const profiles = new Map(); // socket ID -> profile
const friendRequests = new Map(); // username -> Set of usernames
const friends = new Map(); // username -> Set of usernames
const invites = new Map(); // invite ID -> invite data

function cleanUsername(value) {
  return typeof value === "string"
    ? value.trim().replace(/[^a-zA-Z0-9_]/g, "").slice(0, 16)
    : "";
}

function getProfile(socket) {
  return profiles.get(socket.id);
}

function getFriendSet(username) {
  if (!friends.has(username)) friends.set(username, new Set());
  return friends.get(username);
}

function getRequestSet(username) {
  if (!friendRequests.has(username)) friendRequests.set(username, new Set());
  return friendRequests.get(username);
}

function emitFriends(username) {
  const profile = [...profiles.entries()].find(([, p]) => p.username === username);
  if (!profile) return;

  const [socketId] = profile;
  const list = [...getFriendSet(username)].map((friendName) => ({
    username: friendName,
    online: users.has(friendName)
  }));

  io.to(socketId).emit("friendsList", list);
  io.to(socketId).emit("friendRequests", [...getRequestSet(username)]);
}

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  socket.on("setUsername", (rawUsername, callback) => {
    const username = cleanUsername(rawUsername);

    if (username.length < 3) {
      return callback?.({ error: "Username must be 3–16 letters, numbers or underscores." });
    }

    if (users.has(username) && users.get(username) !== socket.id) {
      return callback?.({ error: "Username is already online." });
    }

    const oldProfile = getProfile(socket);
    if (oldProfile) users.delete(oldProfile.username);

    users.set(username, socket.id);
    profiles.set(socket.id, { username });

    getFriendSet(username);
    getRequestSet(username);

    callback?.({ success: true, username });
    emitFriends(username);

    for (const friendName of getFriendSet(username)) {
      emitFriends(friendName);
    }
  });

  socket.on("addFriend", (rawFriendName, callback) => {
    const profile = getProfile(socket);
    if (!profile) return callback?.({ error: "Set your username first." });

    const friendName = cleanUsername(rawFriendName);
    if (!friendName || friendName === profile.username) {
      return callback?.({ error: "Invalid friend username." });
    }

    if (getFriendSet(profile.username).has(friendName)) {
      return callback?.({ error: "Already friends." });
    }

    if (!users.has(friendName)) {
      return callback?.({ error: "That user must be online to receive the request." });
    }

    getRequestSet(friendName).add(profile.username);
    emitFriends(friendName);

    callback?.({ success: true, message: "Friend request sent." });
  });

  socket.on("respondFriendRequest", ({ username: rawUsername, accept }, callback) => {
    const profile = getProfile(socket);
    if (!profile) return callback?.({ error: "Set your username first." });

    const username = cleanUsername(rawUsername);
    if (!getRequestSet(profile.username).has(username)) {
      return callback?.({ error: "Friend request not found." });
    }

    getRequestSet(profile.username).delete(username);

    if (accept) {
      getFriendSet(profile.username).add(username);
      getFriendSet(username).add(profile.username);
    }

    emitFriends(profile.username);
    emitFriends(username);

    callback?.({ success: true });
  });

  socket.on("inviteToRoom", ({ username: rawUsername }, callback) => {
    const profile = getProfile(socket);
    const roomCode = socket.data.roomCode;

    if (!profile || !roomCode) {
      return callback?.({ error: "Join or create a room first." });
    }

    const username = cleanUsername(rawUsername);

    if (!getFriendSet(profile.username).has(username)) {
      return callback?.({ error: "You can invite friends only." });
    }

    const friendSocketId = users.get(username);
    if (!friendSocketId) {
      return callback?.({ error: "Friend is offline." });
    }

    const room = io.sockets.adapter.rooms.get(roomCode);
    if (!room || room.size >= MAX_PLAYERS) {
      return callback?.({ error: "Room is full or no longer exists." });
    }

    const inviteId = `${socket.id}-${Date.now()}`;
    invites.set(inviteId, {
      inviteId,
      from: profile.username,
      to: username,
      roomCode,
      mode: socket.data.mode || "race"
    });

    io.to(friendSocketId).emit("roomInvite", invites.get(inviteId));
    callback?.({ success: true, message: "Room invite sent." });
  });

  socket.on("respondRoomInvite", ({ inviteId, accept }, callback) => {
    const profile = getProfile(socket);
    const invite = invites.get(inviteId);

    if (!profile || !invite || invite.to !== profile.username) {
      return callback?.({ error: "Invite not found." });
    }

    invites.delete(inviteId);

    if (!accept) {
      callback?.({ success: true, accepted: false });
      return;
    }

    const room = io.sockets.adapter.rooms.get(invite.roomCode);
    if (!room || room.size >= MAX_PLAYERS) {
      return callback?.({ error: "Room is full or no longer exists." });
    }

    const oldRoomCode = socket.data.roomCode;
    if (oldRoomCode) {
      socket.to(oldRoomCode).emit("playerLeft", { playerId: socket.id });
      socket.leave(oldRoomCode);
    }

    socket.join(invite.roomCode);
    socket.data.roomCode = invite.roomCode;
    socket.data.mode = invite.mode;

    io.to(invite.roomCode).emit("playerJoined", {
      playerId: socket.id,
      playerCount: room.size
    });

    callback?.({
      success: true,
      accepted: true,
      roomCode: invite.roomCode,
      mode: invite.mode
    });
  });

  socket.on("createRoom", ({ roomCode, mode }, callback) => {
    if (
      typeof roomCode !== "string" ||
      !/^[A-Z0-9]{4,8}$/.test(roomCode) ||
      !["race", "free-ride"].includes(mode)
    ) {
      return callback?.({ error: "Invalid room details" });
    }

    if (io.sockets.adapter.rooms.has(roomCode)) {
      return callback?.({ error: "Room already exists" });
    }

    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.mode = mode;

    callback?.({
      success: true,
      roomCode,
      mode,
      playerId: socket.id
    });
  });

  socket.on("joinRoom", ({ roomCode }, callback) => {
    if (typeof roomCode !== "string") {
      return callback?.({ error: "Invalid room code" });
    }

    roomCode = roomCode.toUpperCase();

    const room = io.sockets.adapter.rooms.get(roomCode);

    if (!room || room.size >= MAX_PLAYERS) {
      return callback?.({ error: "Room not found or full" });
    }

    socket.join(roomCode);
    socket.data.roomCode = roomCode;

    io.to(roomCode).emit("playerJoined", {
      playerId: socket.id,
      playerCount: room.size
    });

    callback?.({
      success: true,
      roomCode,
      playerId: socket.id,
      playerCount: room.size
    });
  });

  socket.on("playerState", (state) => {
    const roomCode = socket.data.roomCode;

    if (!roomCode || !state || typeof state !== "object") return;

    socket.to(roomCode).emit("playerState", {
      playerId: socket.id,
      x: Number(state.x) || 0,
      z: Number(state.z) || 0,
      rotation: Number(state.rotation) || 0,
      speed: Math.max(0, Math.min(300, Number(state.speed) || 0)),
      bikeId: String(state.bikeId || "").slice(0, 40)
    });
  });

  socket.on("leaveRoom", () => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;

    socket.to(roomCode).emit("playerLeft", { playerId: socket.id });
    socket.leave(roomCode);
    delete socket.data.roomCode;
    delete socket.data.mode;
  });

  socket.on("disconnect", () => {
    const roomCode = socket.data.roomCode;
    const profile = getProfile(socket);

    if (roomCode) {
      socket.to(roomCode).emit("playerLeft", { playerId: socket.id });
    }

    if (profile) {
      users.delete(profile.username);
      profiles.delete(socket.id);

      for (const friendName of getFriendSet(profile.username)) {
        emitFriends(friendName);
      }
    }

    console.log("Player disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Multiplayer server running on port ${PORT}`);
});
