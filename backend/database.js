const Database = require('better-sqlite3');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const path = require('path');

const db = new Database(path.join(__dirname, 'chat.db'));
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_key_change_this_in_production_32chars';

// Funciones de encriptación
function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return text;
  }
}

// Crear tablas
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS friendships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    friend_id INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'rejected')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (friend_id) REFERENCES users(id),
    UNIQUE(user_id, friend_id)
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('general', 'private', 'group')),
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS room_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(room_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
  CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);
  CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id);
  CREATE INDEX IF NOT EXISTS idx_room_members_room ON room_members(room_id);
  CREATE INDEX IF NOT EXISTS idx_room_members_user ON room_members(user_id);
`);

// Crear sala general por defecto si no existe
const generalRoom = db.prepare('SELECT * FROM rooms WHERE type = ? AND name = ?').get('general', 'General');
if (!generalRoom) {
  db.prepare('INSERT INTO rooms (name, type) VALUES (?, ?)').run('General', 'general');
}

// Funciones de usuario
const userQueries = {
  create: db.prepare('INSERT INTO users (username, password, display_name) VALUES (?, ?, ?)'),
  findByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
  findById: db.prepare('SELECT id, username, display_name, last_seen FROM users WHERE id = ?'),
  search: db.prepare('SELECT id, username, display_name FROM users WHERE username LIKE ? OR display_name LIKE ? LIMIT 20'),
  updateLastSeen: db.prepare('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?'),
  getAll: db.prepare('SELECT id, username, display_name, last_seen FROM users')
};

// Funciones de amistad
const friendshipQueries = {
  create: db.prepare('INSERT INTO friendships (user_id, friend_id, status) VALUES (?, ?, ?)'),
  findBetween: db.prepare('SELECT * FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)'),
  updateStatus: db.prepare('UPDATE friendships SET status = ? WHERE id = ?'),
  getFriends: db.prepare(`
    SELECT u.id, u.username, u.display_name, u.last_seen 
    FROM users u 
    INNER JOIN friendships f ON (f.friend_id = u.id OR f.user_id = u.id) 
    WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted' AND u.id != ?
  `),
  getPendingRequests: db.prepare(`
    SELECT u.id, u.username, u.display_name, f.id as request_id
    FROM users u 
    INNER JOIN friendships f ON f.user_id = u.id 
    WHERE f.friend_id = ? AND f.status = 'pending'
  `),
  areFriends: db.prepare(`
    SELECT COUNT(*) as count FROM friendships 
    WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)) 
    AND status = 'accepted'
  `)
};

// Funciones de salas
const roomQueries = {
  create: db.prepare('INSERT INTO rooms (name, type, created_by) VALUES (?, ?, ?)'),
  findById: db.prepare('SELECT * FROM rooms WHERE id = ?'),
  getGeneral: db.prepare("SELECT * FROM rooms WHERE type = 'general'"),
  getUserRooms: db.prepare(`
    SELECT r.*, COUNT(DISTINCT m.id) as message_count
    FROM rooms r
    INNER JOIN room_members rm ON rm.room_id = r.id
    LEFT JOIN messages m ON m.room_id = r.id
    WHERE rm.user_id = ?
    GROUP BY r.id
    ORDER BY r.created_at DESC
  `),
  addMember: db.prepare('INSERT OR IGNORE INTO room_members (room_id, user_id) VALUES (?, ?)'),
  getMembers: db.prepare(`
    SELECT u.id, u.username, u.display_name 
    FROM users u 
    INNER JOIN room_members rm ON rm.user_id = u.id 
    WHERE rm.room_id = ?
  `),
  isMember: db.prepare('SELECT COUNT(*) as count FROM room_members WHERE room_id = ? AND user_id = ?'),
  getPrivateRoom: db.prepare(`
    SELECT r.id FROM rooms r
    INNER JOIN room_members rm1 ON rm1.room_id = r.id
    INNER JOIN room_members rm2 ON rm2.room_id = r.id
    WHERE r.type = 'private' AND rm1.user_id = ? AND rm2.user_id = ?
  `)
};

// Funciones de mensajes
const messageQueries = {
  create: db.prepare('INSERT INTO messages (room_id, user_id, content) VALUES (?, ?, ?)'),
  getByRoom: db.prepare(`
    SELECT m.id, m.content, m.created_at, u.id as user_id, u.username, u.display_name
    FROM messages m
    INNER JOIN users u ON u.id = m.user_id
    WHERE m.room_id = ?
    ORDER BY m.created_at DESC
    LIMIT 100
  `)
};

module.exports = {
  db,
  encrypt,
  decrypt,
  userQueries,
  friendshipQueries,
  roomQueries,
  messageQueries
};