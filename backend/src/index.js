const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const os = require('os');
const jwt = require('jsonwebtoken');

const { sequelize, User, Connection, Message } = require('./models');
const seedDatabase = require('./seed');
const { registerChatSubscriptions } = require('./services/chatAccess');
const { registerChatMessages } = require('./services/chatMessages');
const SyncWorker = require('./services/SyncWorker');
const MatchPaymentsWorker = require('./services/MatchPaymentsWorker');
const { setIO, getVenueRoom, getVenueDateRoom } = require('./services/realtime');
const { runCanonicalFoundationBackfill } = require('./services/competitive/backfill');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const courtsRoutes = require('./routes/courts');
const matchesRoutes = require('./routes/matches');
const socialRoutes = require('./routes/social');
const messagesRoutes = require('./routes/messages');
const ratingsRoutes = require('./routes/ratings');
const leaderboardRoutes = require('./routes/leaderboard');
const partnersRoutes = require('./routes/partners');
const paymentsRoutes = require('./routes/payments');
const mapsRoutes = require('./routes/maps');

const app = express();
const server = http.createServer(app);

if (!String(process.env.GOOGLE_MAPS_STATIC_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '').trim()) {
  console.warn('[startup] Maps static preview disabled: missing GOOGLE_MAPS_STATIC_API_KEY');
}

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});
setIO(io);

function createRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getLocalIPv4Addresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const details of interfaces[name] || []) {
      if (details.family === 'IPv4' && !details.internal) {
        addresses.push(details.address);
      }
    }
  }

  return addresses;
}

// Middleware
app.set('trust proxy', true);
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  req.requestId = createRequestId();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

morgan.token('id', (req) => req.requestId || '-');
morgan.token('real-ip', (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.ip;
});
app.use(morgan(':date[iso] :id :real-ip :method :url :status :response-time ms - :res[content-length]'));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/courts', courtsRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/partners', partnersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/maps', mapsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date(), request_id: req.requestId });
});

app.use((req, res) => {
  console.warn(`[404] [${req.requestId}] ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Not found', request_id: req.requestId });
});

app.use((err, req, res, next) => {
  console.error(`[500] [${req.requestId}] ${req.method} ${req.originalUrl}`);
  console.error(err?.stack || err);
  if (res.headersSent) return next(err);

  res.status(err?.status || 500).json({
    error: err?.publicMessage || 'Internal server error',
    request_id: req.requestId,
  });
});

// Socket.io: real-time chat
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No autorizado'));

  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Token invalido'));
  }
});

const userSockets = new Map(); // userId -> socketId

io.on('connection', (socket) => {
  const userId = socket.user.id;
  userSockets.set(userId, socket.id);
  console.log(`[socket] user ${userId} connected`);

  registerChatSubscriptions(socket, Connection);

  socket.on('join_venue_availability', ({ venue_id, date }) => {
    if (!venue_id) return;
    socket.join(getVenueRoom(venue_id));
    if (date) {
      socket.join(getVenueDateRoom(venue_id, date));
    }
  });

  socket.on('leave_venue_availability', ({ venue_id, date }) => {
    if (!venue_id) return;
    socket.leave(getVenueRoom(venue_id));
    if (date) {
      socket.leave(getVenueDateRoom(venue_id, date));
    }
  });

  registerChatMessages(socket, { Connection, Message, User, io, userSockets });

  socket.on('disconnect', () => {
    userSockets.delete(userId);
    console.log(`[socket] user ${userId} disconnected`);
  });
});

// Initialize DB and sync models
sequelize.authenticate()
  .then(() => {
    console.log('[startup] Connecting and syncing models to PostgreSQL...');
    return sequelize.sync({ alter: true }); // Syncs schemas without dropping
  })
  .then(async () => {
    if (process.env.SEED_DEMO === 'true') await seedDatabase();
    const foundationResult = await runCanonicalFoundationBackfill();
    console.log('[startup] Competitive foundation ready:', foundationResult);
    console.log('[startup] ✅ PostgreSQL Models synchronized; optional demo seed and foundation checks complete.');
    
    // Initialize background workers
    if (process.env.DISABLE_BACKGROUND_WORKERS !== 'true') {
      SyncWorker.init();
      MatchPaymentsWorker.init();
    }
  })
  .catch(err => console.error('[startup] ❌ Error syncing models:', err));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n[startup] Padel API running on http://localhost:${PORT}`);

  const localIps = getLocalIPv4Addresses();
  if (localIps.length) {
    localIps.forEach((ip) => {
      console.log(`[startup] LAN URL: http://${ip}:${PORT}`);
    });
  }

  console.log('[startup] Socket.io ready');
  console.log('[startup] Database: PostgreSQL');
  console.log('[startup] Request logs enabled with morgan\n');
});
