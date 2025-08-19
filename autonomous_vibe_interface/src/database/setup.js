const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Database path
const dbPath = path.join(dbDir, 'auth.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

// Create users table
const createUsersTable = () => {
    const sql = `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            first_name TEXT,
            last_name TEXT,
            is_verified BOOLEAN DEFAULT 0,
            verification_token TEXT,
            reset_token TEXT,
            reset_token_expires DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME,
            login_attempts INTEGER DEFAULT 0,
            locked_until DATETIME,
            role TEXT DEFAULT 'user',
            api_key TEXT,
            preferences TEXT
        )
    `;
    
    db.run(sql, (err) => {
        if (err) {
            console.error('Error creating users table:', err);
        } else {
            console.log('Users table created successfully');
        }
    });
};

// Create sessions table for refresh tokens
const createSessionsTable = () => {
    const sql = `
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            refresh_token TEXT UNIQUE NOT NULL,
            expires_at DATETIME NOT NULL,
            ip_address TEXT,
            user_agent TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `;
    
    db.run(sql, (err) => {
        if (err) {
            console.error('Error creating sessions table:', err);
        } else {
            console.log('Sessions table created successfully');
        }
    });
};

// Create roles table for RBAC
const createRolesTable = () => {
    const sql = `
        CREATE TABLE IF NOT EXISTS roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            permissions TEXT, -- JSON string of permissions array
            is_system_role BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    db.run(sql, (err) => {
        if (err) {
            console.error('Error creating roles table:', err);
        } else {
            console.log('Roles table created successfully');
            insertDefaultRoles();
        }
    });
};

// Create user roles junction table
const createUserRolesTable = () => {
    const sql = `
        CREATE TABLE IF NOT EXISTS user_roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            role_id INTEGER NOT NULL,
            assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            assigned_by INTEGER,
            expires_at DATETIME,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
            FOREIGN KEY (assigned_by) REFERENCES users (id),
            UNIQUE(user_id, role_id)
        )
    `;
    
    db.run(sql, (err) => {
        if (err) {
            console.error('Error creating user_roles table:', err);
        } else {
            console.log('User roles table created successfully');
        }
    });
};

// Create permissions table
const createPermissionsTable = () => {
    const sql = `
        CREATE TABLE IF NOT EXISTS permissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            resource TEXT NOT NULL,
            action TEXT NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    db.run(sql, (err) => {
        if (err) {
            console.error('Error creating permissions table:', err);
        } else {
            console.log('Permissions table created successfully');
        }
    });
};

// Insert default roles
const insertDefaultRoles = () => {
    const defaultRoles = [
        {
            name: 'super_admin',
            description: 'Full system access with all permissions',
            permissions: JSON.stringify(['*']),
            is_system_role: 1
        },
        {
            name: 'admin',
            description: 'Administrative access with user management',
            permissions: JSON.stringify([
                'users:read', 'users:write', 'users:delete',
                'roles:read', 'roles:write',
                'audit:read'
            ]),
            is_system_role: 1
        },
        {
            name: 'moderator',
            description: 'Content moderation and limited user management',
            permissions: JSON.stringify([
                'users:read', 'users:suspend',
                'content:moderate',
                'reports:read'
            ]),
            is_system_role: 1
        },
        {
            name: 'user',
            description: 'Standard user access',
            permissions: JSON.stringify([
                'profile:read', 'profile:write',
                'content:create', 'content:read'
            ]),
            is_system_role: 1
        },
        {
            name: 'guest',
            description: 'Limited read-only access',
            permissions: JSON.stringify(['content:read']),
            is_system_role: 1
        }
    ];

    defaultRoles.forEach(role => {
        db.run(
            `INSERT OR IGNORE INTO roles (name, description, permissions, is_system_role) 
             VALUES (?, ?, ?, ?)`,
            [role.name, role.description, role.permissions, role.is_system_role],
            (err) => {
                if (err) {
                    console.error(`Error inserting role ${role.name}:`, err);
                }
            }
        );
    });
};

// Enhanced sessions table with device tracking
const enhanceSessionsTable = () => {
    const sql = `
        CREATE TABLE IF NOT EXISTS sessions_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token_id TEXT UNIQUE NOT NULL,
            refresh_token TEXT UNIQUE NOT NULL,
            device_info TEXT,
            ip_address TEXT,
            user_agent TEXT,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_revoked BOOLEAN DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `;
    
    db.run(sql, (err) => {
        if (err) {
            console.error('Error creating enhanced sessions table:', err);
        } else {
            // Migrate data if old table exists
            db.run(`INSERT OR IGNORE INTO sessions_new (user_id, refresh_token, expires_at, ip_address, user_agent, created_at)
                   SELECT user_id, refresh_token, expires_at, ip_address, user_agent, created_at FROM sessions`, (err) => {
                if (!err) {
                    db.run('DROP TABLE IF EXISTS sessions');
                    db.run('ALTER TABLE sessions_new RENAME TO sessions');
                }
            });
            console.log('Enhanced sessions table created successfully');
        }
    });
};

// Create audit log table
const createAuditLogTable = () => {
    const sql = `
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            resource TEXT,
            details TEXT,
            ip_address TEXT,
            user_agent TEXT,
            success BOOLEAN NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    `;
    
    db.run(sql, (err) => {
        if (err) {
            console.error('Error creating audit_log table:', err);
        } else {
            console.log('Audit log table created successfully');
        }
    });
};

// Initialize all tables
const initializeDatabase = () => {
    createUsersTable();
    createSessionsTable();
    createAuditLogTable();
    
    // Create indexes for better performance
    db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    db.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
    db.run('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(refresh_token)');
    db.run('CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)');
};

// Export database instance and initialization function
module.exports = {
    db,
    initializeDatabase
};

// Initialize database if run directly
if (require.main === module) {
    initializeDatabase();
    console.log('Database setup complete');
}