require('dotenv').config({
  path: require('path').resolve(__dirname, '../.env')
});

const app = require("./app");
const http = require("http");
const { initSocket } = require("./socket");
const { initializeFirebase } = require("./utils/sendNotifications");
const setupBullBoard = require("./bullboard");
const sendDltOtp = require('./utils/sendDlt');

const PORT = process.env.PORT || 5001;

// Create HTTP server
const server = http.createServer(app);

// Initialize socket.io on SAME server
setupBullBoard(app);
initSocket(server);
initializeFirebase()
// ✅ LISTEN ON SERVER (NOT app)
server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Bull Board available at http://localhost:${PORT}/admin/queues`
  );
  console.log(`🚀 HTTP + Socket server running on IPv4 :${PORT}`);
});
