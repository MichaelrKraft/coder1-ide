const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { db } = require('../database/setup');

class User {
    constructor(data) {
        this.id = data.id;
        this.email = data.email;
        this.username = data.username;
        this.password = data.password;
        this.firstName = data.first_name;
        this.lastName = data.last_name;
        this.isVerified = data.is_verified;
        this.role = data.role || 'user';
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
        this.lastLogin = data.last_login;
        this.loginAttempts = data.login_attempts || 0;
        this.lockedUntil = data.locked_until;
        this.preferences = data.preferences ? JSON.parse(data.preferences) : {};
    }

    // Hash password before saving
    static async hashPassword(password) {
        const salt = await bcrypt.genSalt(12);
        return bcrypt.hash(password, salt);
    }

    // Verify password
    async verifyPassword(password) {
        return bcrypt.compare(password, this.password);
    }

    // Find user by email
    static async findByEmail(email) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row ? new User(row) : null);
                }
            });
        });
    }

    // Find user by username
    static async findByUsername(username) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE username = ?', [username.toLowerCase()], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row ? new User(row) : null);
                }
            });
        });
    }

    // Find user by ID
    static async findById(id) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row ? new User(row) : null);
                }
            });
        });
    }

    // Create new user
    static async create(userData) {
        const {
            email,
            username,
            password,
            firstName,
            lastName,
            role = 'user'
        } = userData;

        // Hash password
        const hashedPassword = await this.hashPassword(password);
        
        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO users (
                    email, username, password, first_name, last_name, 
                    verification_token, role
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            
            db.run(sql, [
                email.toLowerCase(),
                username.toLowerCase(),
                hashedPassword,
                firstName,
                lastName,
                verificationToken,
                role
            ], function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        if (err.message.includes('email')) {
                            reject(new Error('Email already exists'));
                        } else if (err.message.includes('username')) {
                            reject(new Error('Username already exists'));
                        }
                    }
                    reject(err);
                } else {
                    resolve({
                        id: this.lastID,
                        email,
                        username,
                        verificationToken
                    });
                }
            });
        });
    }

    // Update user
    async update(updates) {
        const allowedUpdates = [
            'first_name', 'last_name', 'is_verified', 
            'last_login', 'login_attempts', 'locked_until',
            'preferences', 'api_key'
        ];

        const updateFields = [];
        const values = [];

        for (const [key, value] of Object.entries(updates)) {
            if (allowedUpdates.includes(key)) {
                updateFields.push(`${key} = ?`);
                if (key === 'preferences' && typeof value === 'object') {
                    values.push(JSON.stringify(value));
                } else {
                    values.push(value);
                }
            }
        }

        if (updateFields.length === 0) {
            return this;
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(this.id);

        return new Promise((resolve, reject) => {
            const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
            
            db.run(sql, values, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(this);
                }
            });
        });
    }

    // Generate password reset token
    async generateResetToken() {
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const expires = new Date(Date.now() + 3600000); // 1 hour

        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE users 
                SET reset_token = ?, reset_token_expires = ?
                WHERE id = ?
            `;
            
            db.run(sql, [hashedToken, expires.toISOString(), this.id], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(resetToken);
                }
            });
        });
    }

    // Find user by reset token
    static async findByResetToken(token) {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM users 
                WHERE reset_token = ? 
                AND reset_token_expires > datetime('now')
            `;
            
            db.get(sql, [hashedToken], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row ? new User(row) : null);
                }
            });
        });
    }

    // Reset password
    async resetPassword(newPassword) {
        const hashedPassword = await User.hashPassword(newPassword);
        
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE users 
                SET password = ?, reset_token = NULL, reset_token_expires = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            
            db.run(sql, [hashedPassword, this.id], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(true);
                }
            });
        });
    }

    // Verify email
    static async verifyEmail(token) {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE users 
                SET is_verified = 1, verification_token = NULL
                WHERE verification_token = ?
            `;
            
            db.run(sql, [token], function(err) {
                if (err) {
                    reject(err);
                } else if (this.changes === 0) {
                    reject(new Error('Invalid verification token'));
                } else {
                    resolve(true);
                }
            });
        });
    }

    // Update login info
    async updateLoginInfo(ip) {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE users 
                SET last_login = CURRENT_TIMESTAMP, 
                    login_attempts = 0,
                    locked_until = NULL
                WHERE id = ?
            `;
            
            db.run(sql, [this.id], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(true);
                }
            });
        });
    }

    // Handle failed login
    async handleFailedLogin() {
        this.loginAttempts += 1;
        let lockedUntil = null;

        // Lock account after 5 failed attempts for 30 minutes
        if (this.loginAttempts >= 5) {
            lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        }

        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE users 
                SET login_attempts = ?, locked_until = ?
                WHERE id = ?
            `;
            
            db.run(sql, [this.loginAttempts, lockedUntil, this.id], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        attempts: this.loginAttempts,
                        locked: !!lockedUntil
                    });
                }
            });
        });
    }

    // Check if account is locked
    isLocked() {
        if (!this.lockedUntil) return false;
        return new Date(this.lockedUntil) > new Date();
    }

    // Convert to safe JSON (remove password)
    toJSON() {
        return {
            id: this.id,
            email: this.email,
            username: this.username,
            firstName: this.firstName,
            lastName: this.lastName,
            isVerified: this.isVerified,
            role: this.role,
            createdAt: this.createdAt,
            lastLogin: this.lastLogin,
            preferences: this.preferences
        };
    }
}

module.exports = User;