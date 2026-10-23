
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

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

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
      return callback?.({
        error: "Room not found or full"
      });
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

    if (!roomCode || !state || typeof state !== "object") {
      return;
    }

    const safeState = {
      playerId: socket.id,
      x: Number(state.x) || 0,
      z: Number(state.z) || 0,
      rotation: Number(state.rotation) || 0,
      speed: Math.max(
        0,
        Math.min(300, Number(state.speed) || 0)
      ),
      bikeId: String(state.bikeId || "").slice(0, 40)
    };

    socket.to(roomCode).emit("playerState", safeState);
  });

  socket.on("leaveRoom", () => {
    const roomCode = socket.data.roomCode;

    if (roomCode) {
      socket.to(roomCode).emit("playerLeft", {
        playerId: socket.id
      });

      socket.leave(roomCode);
      delete socket.data.roomCode;
      delete socket.data.mode;
    }
  });

  socket.on("disconnect", () => {
    const roomCode = socket.data.roomCode;

    if (roomCode) {
      socket.to(roomCode).emit("playerLeft", {
        playerId: socket.id
      });
    }

    console.log("Player disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Multiplayer server running on port ${PORT}`);
});
