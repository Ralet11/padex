const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database.sqlite');
let db;

function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT,
      position TEXT DEFAULT 'drive',
      paddle_brand TEXT,
      favorite_court_id INTEGER,
      preferred_partner TEXT,
      bio TEXT,
      elo INTEGER DEFAULT 1000,
      category TEXT DEFAULT 'principiante',
      self_category TEXT,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS courts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      whatsapp TEXT,
      email TEXT,
      image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      court_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      duration INTEGER DEFAULT 90,
      price REAL DEFAULT 0,
      max_players INTEGER DEFAULT 4,
      is_available INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (court_id) REFERENCES courts(id)
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      creator_id INTEGER NOT NULL,
      slot_id INTEGER NOT NULL,
      title TEXT,
      description TEXT,
      status TEXT DEFAULT 'open',
      min_players INTEGER DEFAULT 3,
      max_players INTEGER DEFAULT 4,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES users(id),
      FOREIGN KEY (slot_id) REFERENCES slots(id)
    );

    CREATE TABLE IF NOT EXISTS match_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      team TEXT,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(match_id, user_id),
      FOREIGN KEY (match_id) REFERENCES matches(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requester_id INTEGER NOT NULL,
      addressee_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(requester_id, addressee_id),
      FOREIGN KEY (requester_id) REFERENCES users(id),
      FOREIGN KEY (addressee_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      connection_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      read_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (connection_id) REFERENCES connections(id),
      FOREIGN KEY (sender_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rater_id INTEGER NOT NULL,
      rated_id INTEGER NOT NULL,
      match_id INTEGER,
      score INTEGER NOT NULL,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(rater_id, rated_id, match_id),
      FOREIGN KEY (rater_id) REFERENCES users(id),
      FOREIGN KEY (rated_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      data TEXT,
      read_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  const count = db.prepare('SELECT COUNT(*) as c FROM courts').get();
  if (count.c === 0) seedData();
}

function seedData() {
  const insertCourt = db.prepare(
    'INSERT INTO courts (name, address, phone, whatsapp, email) VALUES (?, ?, ?, ?, ?)'
  );
  const insertSlot = db.prepare(
    'INSERT INTO slots (court_id, date, time, duration, price) VALUES (?, ?, ?, ?, ?)'
  );

  const courts = [
    ['Padel Club Buenos Aires', 'Av. Corrientes 1234, CABA', '+5491100001111', '+5491100001111', 'reservas@padelclub.com'],
    ['El Patio Padel', 'Av. Santa Fe 2500, Palermo', '+5491122223333', '+5491122223333', 'info@elpatio.com'],
    ['Top Spin Padel', 'Av. Cabildo 890, Belgrano', '+5491144445555', '+5491144445555', 'reservas@topspin.com'],
  ];

  const times = ['08:00', '09:30', '11:00', '12:30', '14:00', '15:30', '17:00', '18:30', '20:00', '21:30'];
  const prices = [2500, 3000, 2800];

  const courtIds = courts.map((c, i) => {
    const r = insertCourt.run(...c);
    return { id: r.lastInsertRowid, price: prices[i] };
  });

  for (let day = 0; day < 14; day++) {
    const d = new Date();
    d.setDate(d.getDate() + day);
    const dateStr = d.toISOString().split('T')[0];
    for (const court of courtIds) {
      for (const time of times) {
        insertSlot.run(court.id, dateStr, time, 90, court.price);
      }
    }
  }

  console.log('✅ Base de datos sembrada con canchas y turnos');
}

module.exports = { getDB };
