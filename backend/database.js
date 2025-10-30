const initSqlJs = require('sql.js');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Validación de clave de encriptación
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
  console.error('⚠️  ADVERTENCIA: ENCRYPTION_KEY debe tener al menos 32 caracteres');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ENCRYPTION_KEY inválida en producción');
  }
}

const KEY_BUFFER = crypto.scryptSync(
  ENCRYPTION_KEY || 'dev_key_change_in_production_32ch',
  'salt',
  32
);

// Inicialización de base de datos
const dbPath = process.env.DB_PATH || path.join(__dirname, 'chat.db');
let db = null;
let SQL = null;
let isInTransaction = false;

// Funciones de encriptación
function encrypt(text) {
  if (!text) throw new Error('Texto a encriptar no puede estar vacío');
  
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', KEY_BUFFER, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('[encrypt] Error:', error);
    throw new Error('Error al encriptar');
  }
}

function decrypt(text) {
  if (!text) return '';
  
  try {
    const parts = text.split(':');
    if (parts.length !== 2) return text;
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', KEY_BUFFER, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('[decrypt] Error:', error);
    return '[Error al desencriptar]';
  }
}

// Guardar base de datos en disco
function saveDatabase() {
  if (db && typeof db.export === 'function') {
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    } catch (error) {
      console.error('Error al guardar base de datos:', error.message);
    }
  }
}

// Wrapper para queries preparadas
class PreparedStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
  }

  run(...params) {
    this.db.run(this.sql, params);
    const lastId = this.db.exec("SELECT last_insert_rowid() as id")[0]?.values[0]?.[0] || 0;
    const changes = this.db.getRowsModified();
    
    // Solo guardar si no estamos en una transacción
    if (!isInTransaction) {
      saveDatabase();
    }
    
    return { 
      lastInsertRowid: lastId,
      changes: changes
    };
  }

  get(...params) {
    const result = this.db.exec(this.sql, params);
    if (!result[0]) return undefined;
    const columns = result[0].columns;
    const values = result[0].values[0];
    if (!values) return undefined;
    
    const row = {};
    columns.forEach((col, i) => {
      row[col] = values[i];
    });
    return row;
  }

  all(...params) {
    const result = this.db.exec(this.sql, params);
    if (!result[0]) return [];
    const columns = result[0].columns;
    const values = result[0].values;
    
    return values.map(row => {
      const obj = {};
      columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });
  }
}

// Wrapper para transacciones
function transaction(fn) {
  return (...args) => {
    let transactionStarted = false;
    try {
      db.run('BEGIN TRANSACTION');
      transactionStarted = true;
      const result = fn(...args);
      db.run('COMMIT');
      saveDatabase();
      return result;
    } catch (error) {
      if (transactionStarted) {
        try {
          db.run('ROLLBACK');
        } catch (rollbackError) {
          console.error('Error al hacer rollback:', rollbackError.message);
        }
      }
      throw error;
    }
  };
}

// Inicializar la base de datos
async function initDatabase() {
  SQL = await initSqlJs();
  
  // Cargar base de datos existente o crear nueva
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Configuración de rendimiento (PRAGMA)
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA synchronous = NORMAL');
  db.run('PRAGMA cache_size = 10000');
  db.run('PRAGMA foreign_keys = ON');

  // Crear tablas
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      CHECK(length(username) >= 3 AND length(username) <= 20),
      CHECK(length(display_name) >= 1 AND length(display_name) <= 50)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS friendships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      friend_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'rejected')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, friend_id),
      CHECK(user_id != friend_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('general', 'private', 'group')),
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
      CHECK(length(name) >= 1 AND length(name) <= 100)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS room_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(room_id, user_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CHECK(length(content) >= 1)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS message_reads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(message_id, user_id)
    )
  `);

  // Índices simples
  db.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
  db.run('CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at)');
  db.run('CREATE INDEX IF NOT EXISTS idx_room_members_room ON room_members(room_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_room_members_user ON room_members(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_message_reads_message ON message_reads(message_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_message_reads_user ON message_reads(user_id)');
  
  // Índices compuestos para queries comunes
  db.run('CREATE INDEX IF NOT EXISTS idx_friendships_composite ON friendships(user_id, friend_id, status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_messages_room_created ON messages(room_id, created_at DESC)');
  db.run('CREATE INDEX IF NOT EXISTS idx_room_members_composite ON room_members(room_id, user_id)');

  // Crear sala general si no existe
  const generalRoom = new PreparedStatement(db, 'SELECT id FROM rooms WHERE type = ? AND name = ?')
    .get('general', 'General');
  
  if (!generalRoom) {
    new PreparedStatement(db, 'INSERT INTO rooms (name, type) VALUES (?, ?)')
      .run('General', 'general');
    console.log('✓ Sala General creada');
  }

  // Guardar después de inicializar
  saveDatabase();
  console.log('✓ Base de datos inicializada correctamente');
}

// Queries preparadas - USUARIOS
const userQueries = {
  get create() { return new PreparedStatement(db, 'INSERT INTO users (username, password, display_name) VALUES (?, ?, ?)'); },
  
  get findByUsername() { return new PreparedStatement(db, 'SELECT * FROM users WHERE username = ? COLLATE NOCASE'); },
  
  get findById() { return new PreparedStatement(db, 'SELECT id, username, display_name, last_seen, created_at FROM users WHERE id = ?'); },
  
  get search() { return new PreparedStatement(db, `
    SELECT id, username, display_name, last_seen 
    FROM users 
    WHERE (username LIKE ? OR display_name LIKE ?) 
    ORDER BY username ASC 
    LIMIT 20
  `); },
  
  get updateLastSeen() { return new PreparedStatement(db, 'UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?'); },
  
  get getAll() { return new PreparedStatement(db, `
    SELECT id, username, display_name, last_seen, created_at 
    FROM users 
    ORDER BY username ASC
  `); },
  
  get exists() { return new PreparedStatement(db, 'SELECT COUNT(*) as count FROM users WHERE id = ?'); }
};

// Queries preparadas - AMISTAD
const friendshipQueries = {
  get create() { return new PreparedStatement(db, 'INSERT INTO friendships (user_id, friend_id, status) VALUES (?, ?, ?)'); },
  
  get findBetween() { return new PreparedStatement(db, `
    SELECT * FROM friendships 
    WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
  `); },
  
  get updateStatus() { return new PreparedStatement(db, `
    UPDATE friendships 
    SET status = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `); },
  
  get deleteRejected() { return new PreparedStatement(db, `
    DELETE FROM friendships 
    WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)) 
    AND status = ?
  `); },
  
  get getFriends() { return new PreparedStatement(db, `
    SELECT u.id, u.username, u.display_name, u.last_seen 
    FROM users u 
    INNER JOIN friendships f ON (f.friend_id = u.id OR f.user_id = u.id) 
    WHERE (f.user_id = ? OR f.friend_id = ?) 
    AND f.status = 'accepted' 
    AND u.id != ?
    ORDER BY u.username ASC
  `); },
  
  get getPendingRequests() { return new PreparedStatement(db, `
    SELECT u.id, u.username, u.display_name, f.id as request_id, f.created_at
    FROM users u 
    INNER JOIN friendships f ON f.user_id = u.id 
    WHERE f.friend_id = ? AND f.status = 'pending'
    ORDER BY f.created_at DESC
  `); },
  
  get areFriends() { return new PreparedStatement(db, `
    SELECT COUNT(*) as count FROM friendships 
    WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)) 
    AND status = 'accepted'
  `); }
};

// Queries preparadas - SALAS
const roomQueries = {
  get create() { return new PreparedStatement(db, 'INSERT INTO rooms (name, type, created_by) VALUES (?, ?, ?)'); },
  
  get findById() { return new PreparedStatement(db, 'SELECT * FROM rooms WHERE id = ?'); },
  
  get getGeneral() { return new PreparedStatement(db, `
    SELECT * FROM rooms 
    WHERE type = 'general' 
    ORDER BY created_at ASC
  `); },
  
  get getUserRooms() { return new PreparedStatement(db, `
    SELECT 
      r.*,
      COUNT(DISTINCT m.id) as message_count,
      MAX(m.created_at) as last_message_at
    FROM rooms r
    INNER JOIN room_members rm ON rm.room_id = r.id
    LEFT JOIN messages m ON m.room_id = r.id
    WHERE rm.user_id = ?
    GROUP BY r.id
    ORDER BY last_message_at DESC, r.created_at DESC
  `); },
  
  get addMember() { return new PreparedStatement(db, 'INSERT OR IGNORE INTO room_members (room_id, user_id) VALUES (?, ?)'); },
  
  get removeMember() { return new PreparedStatement(db, 'DELETE FROM room_members WHERE room_id = ? AND user_id = ?'); },
  
  get getMembers() { return new PreparedStatement(db, `
    SELECT u.id, u.username, u.display_name, rm.joined_at
    FROM users u 
    INNER JOIN room_members rm ON rm.user_id = u.id 
    WHERE rm.room_id = ?
    ORDER BY rm.joined_at ASC
  `); },
  
  get isMember() { return new PreparedStatement(db, `
    SELECT COUNT(*) as count 
    FROM room_members 
    WHERE room_id = ? AND user_id = ?
  `); },
  
  get getPrivateRoom() { return new PreparedStatement(db, `
    SELECT r.id, r.name, r.type 
    FROM rooms r
    INNER JOIN room_members rm1 ON rm1.room_id = r.id
    INNER JOIN room_members rm2 ON rm2.room_id = r.id
    WHERE r.type = 'private' 
    AND rm1.user_id = ? 
    AND rm2.user_id = ?
    AND rm1.user_id != rm2.user_id
    LIMIT 1
  `); }
};

// Queries preparadas - MENSAJES
const messageQueries = {
  get create() { return new PreparedStatement(db, 'INSERT INTO messages (room_id, user_id, content) VALUES (?, ?, ?)'); },
  
  get getByRoom() { return new PreparedStatement(db, `
    SELECT 
      m.id, 
      m.content, 
      m.created_at, 
      u.id as user_id, 
      u.username, 
      u.display_name,
      (SELECT COUNT(*) FROM message_reads mr WHERE mr.message_id = m.id) as read_count
    FROM messages m
    INNER JOIN users u ON u.id = m.user_id
    WHERE m.room_id = ?
    ORDER BY m.created_at DESC
    LIMIT 100
  `); },
  
  get getMessageWithUser() { return new PreparedStatement(db, `
    SELECT 
      m.id, 
      m.room_id, 
      m.content, 
      m.created_at, 
      m.user_id,
      u.username, 
      u.display_name
    FROM messages m
    INNER JOIN users u ON u.id = m.user_id
    WHERE m.id = ?
  `); },
  
  get markAsRead() { return new PreparedStatement(db, 'INSERT OR IGNORE INTO message_reads (message_id, user_id) VALUES (?, ?)'); },
  
  get getUnreadCount() { return new PreparedStatement(db, `
    SELECT COUNT(*) as count 
    FROM messages m
    WHERE m.room_id = ? 
    AND m.user_id != ? 
    AND NOT EXISTS (
      SELECT 1 FROM message_reads mr 
      WHERE mr.message_id = m.id AND mr.user_id = ?
    )
  `); },
  
  get getReadStatus() { return new PreparedStatement(db, `
    SELECT mr.user_id, u.username, u.display_name, mr.read_at
    FROM message_reads mr
    INNER JOIN users u ON u.id = mr.user_id
    WHERE mr.message_id = ?
    ORDER BY mr.read_at ASC
  `); },
  
  get delete() { return new PreparedStatement(db, 'DELETE FROM messages WHERE id = ? AND user_id = ?'); }
};

// Transacción para operaciones complejas
function createPrivateRoomTransaction(userId, friendId, roomName) {
  isInTransaction = true;
  db.run('BEGIN TRANSACTION');
  try {
    const result = roomQueries.create.run(roomName, 'private', userId);
    const roomId = result.lastInsertRowid;
    
    roomQueries.addMember.run(roomId, userId);
    roomQueries.addMember.run(roomId, friendId);
    
    db.run('COMMIT');
    isInTransaction = false;
    saveDatabase();
    return roomId;
  } catch (error) {
    isInTransaction = false;
    try {
      db.run('ROLLBACK');
    } catch (e) {
      // Ignorar errores de rollback
    }
    throw error;
  }
}

// Cierre graceful
process.on('SIGINT', () => {
  console.log('\n[DB] Cerrando conexión...');
  saveDatabase();
  if (db) db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[DB] Cerrando conexión...');
  saveDatabase();
  if (db) db.close();
  process.exit(0);
});

// Inicializar la base de datos y exportar
const dbPromise = initDatabase();

module.exports = {
  get db() { return db; },
  encrypt,
  decrypt,
  userQueries,
  friendshipQueries,
  roomQueries,
  messageQueries,
  createPrivateRoomTransaction,
  dbPromise,
  saveDatabase
};