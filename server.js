const WebSocket = require("ws");

// Start the server on port 8080
const wss = new WebSocket.Server({ port: 8080 });

const rooms = new Map();

wss.on("connection", (ws) => {
  console.log("New tab connected to signaling server.");

  ws.on("message", (message) => {
    const data = JSON.parse(message);
    const { type, roomId } = data;

    if (type === "join") {
      if (!rooms.has(roomId)) rooms.set(roomId, new Set());
      const room = rooms.get(roomId);

      if (room.size < 2) {
        room.add(ws);
        ws.roomId = roomId;
        console.log(`User joined: ${roomId}. Room size: ${room.size}`);

        // When 2 people are in, assign roles: Caller and Receiver
        if (room.size === 2) {
          const clients = Array.from(room);
          clients[0].send(JSON.stringify({ type: "ready", isCaller: true }));
          clients[1].send(JSON.stringify({ type: "ready", isCaller: false }));
        }
      }
    } else if (type === "signal") {
      // Relay WebRTC data (Offers, Answers, ICE Candidates) to the other tab
      const targetRoom = rooms.get(roomId);
      if (targetRoom) {
        targetRoom.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
      }
    }
  });

  ws.on("close", () => {
    if (ws.roomId && rooms.has(ws.roomId)) {
      rooms.get(ws.roomId).delete(ws);
    }
  });
});

console.log("Signaling Server running on ws://localhost:8080");
