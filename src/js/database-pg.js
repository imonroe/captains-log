/**
 * Database module - Handles PostgreSQL database operations for the Captain's Log application
 * This is the containerized version that uses PostgreSQL instead of in-memory storage
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/captains_log',
});

// Default user ID
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000';

// State to track current user
let currentUser = null;

// Generate a UUID
function generateUUID() {
  return crypto.randomUUID();
}

// Initialize the database connection
async function initializeDatabase() {
  try {
    // Test the connection
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database');
    client.release();
    return true;
  } catch (error) {
    console.error('Failed to connect to PostgreSQL database:', error);
    throw error;
  }
}

// Utility function to hash passwords
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

// User repository
const usersRepo = {
  // Create a new user
  async create(email, password, name, providedId = null) {
    const client = await pool.connect();
    
    try {
      // Check if email already exists
      const checkResult = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      
      if (checkResult.rows.length > 0) {
        return { success: false, error: 'Email already in use' };
      }
      
      const userId = providedId || generateUUID();
      const hashedPassword = await hashPassword(password);
      
      // Insert the new user
      await client.query(
        `INSERT INTO users (id, name, email, password, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [userId, name || email.split('@')[0], email.toLowerCase(), hashedPassword]
      );
      
      // Get the created user (without password)
      const userResult = await client.query(
        'SELECT id, name, email, created_at, updated_at FROM users WHERE id = $1',
        [userId]
      );
      
      return {
        success: true,
        user: userResult.rows[0]
      };
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, error: 'Failed to create user' };
    } finally {
      client.release();
    }
  },
  
  // Authenticate a user
  async authenticate(email, password) {
    const client = await pool.connect();
    
    try {
      // Find user by email
      const userResult = await client.query(
        'SELECT * FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      
      if (userResult.rows.length === 0) {
        return { success: false, error: 'User not found' };
      }
      
      const user = userResult.rows[0];
      
      // Check password
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return { success: false, error: 'Invalid password' };
      }
      
      // Update last login timestamp
      await client.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [user.id]
      );
      
      // Set as current user
      currentUser = user.id;
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return {
        success: true,
        user: userWithoutPassword
      };
    } catch (error) {
      console.error('Error authenticating user:', error);
      return { success: false, error: 'Authentication failed' };
    } finally {
      client.release();
    }
  },
  
  // Logout current user
  logout() {
    currentUser = null;
    return true;
  },
  
  // Get current user
  async getCurrentUser() {
    if (!currentUser) return null;
    
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT id, name, email, settings, created_at, updated_at FROM users WHERE id = $1',
        [currentUser]
      );
      
      if (result.rows.length === 0) {
        currentUser = null;
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    } finally {
      client.release();
    }
  },
  
  // Find user by ID
  async findById(id) {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      return null;
    } finally {
      client.release();
    }
  },
  
  // Find user by email
  async findByEmail(email) {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
    } finally {
      client.release();
    }
  },
  
  // Update user profile
  async updateProfile(userId, updates) {
    const client = await pool.connect();
    
    try {
      // Check if user exists
      const userCheck = await client.query(
        'SELECT id FROM users WHERE id = $1',
        [userId]
      );
      
      if (userCheck.rows.length === 0) {
        return { success: false, error: 'User not found' };
      }
      
      // Check if trying to update to an email that's already in use
      if (updates.email) {
        const emailCheck = await client.query(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [updates.email.toLowerCase(), userId]
        );
        
        if (emailCheck.rows.length > 0) {
          return { success: false, error: 'Email already in use' };
        }
      }
      
      // Build update query
      let updateFields = [];
      let queryParams = [];
      let paramIndex = 1;
      
      if (updates.name) {
        updateFields.push(`name = $${paramIndex}`);
        queryParams.push(updates.name);
        paramIndex++;
      }
      
      if (updates.email) {
        updateFields.push(`email = $${paramIndex}`);
        queryParams.push(updates.email.toLowerCase());
        paramIndex++;
      }
      
      if (updates.password) {
        updateFields.push(`password = $${paramIndex}`);
        queryParams.push(await hashPassword(updates.password));
        paramIndex++;
      }
      
      if (updates.settings) {
        updateFields.push(`settings = $${paramIndex}`);
        queryParams.push(updates.settings);
        paramIndex++;
      }
      
      // Add updated_at timestamp
      updateFields.push(`updated_at = NOW()`);
      
      // Add userId to params
      queryParams.push(userId);
      
      // Execute update
      if (updateFields.length > 0) {
        await client.query(
          `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
          queryParams
        );
      }
      
      // Get updated user
      const updatedUser = await client.query(
        'SELECT id, name, email, settings, created_at, updated_at FROM users WHERE id = $1',
        [userId]
      );
      
      return {
        success: true,
        user: updatedUser.rows[0]
      };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return { success: false, error: 'Failed to update profile' };
    } finally {
      client.release();
    }
  },
  
  // Update user settings
  async updateSettings(userId, settings) {
    const client = await pool.connect();
    
    try {
      // Check if user exists
      const userCheck = await client.query(
        'SELECT id FROM users WHERE id = $1',
        [userId]
      );
      
      if (userCheck.rows.length === 0) {
        return { success: false, error: 'User not found' };
      }
      
      // Update settings
      await client.query(
        'UPDATE users SET settings = $1, updated_at = NOW() WHERE id = $2',
        [settings, userId]
      );
      
      return { success: true };
    } catch (error) {
      console.error('Error updating user settings:', error);
      return { success: false, error: 'Failed to update settings' };
    } finally {
      client.release();
    }
  },
  
  // Generate password reset token
  async generateResetToken(email) {
    const client = await pool.connect();
    
    try {
      // Find user by email
      const userResult = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      
      // For security, don't reveal if email exists
      if (userResult.rows.length === 0) {
        return { success: true };
      }
      
      // Generate token and set expiry
      const resetToken = generateUUID();
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 24); // 24 hour expiry
      
      // Update user with token
      await client.query(
        'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3',
        [resetToken, expiryDate, userResult.rows[0].id]
      );
      
      // In a real app, send email with reset link
      console.log(`Password reset token for ${email}: ${resetToken}`);
      
      return { success: true };
    } catch (error) {
      console.error('Error generating reset token:', error);
      return { success: false, error: 'Failed to generate reset token' };
    } finally {
      client.release();
    }
  },
  
  // Reset password using token
  async resetPassword(token, newPassword) {
    const client = await pool.connect();
    
    try {
      // Find user by token
      const userResult = await client.query(
        'SELECT id, reset_token_expiry FROM users WHERE reset_token = $1',
        [token]
      );
      
      if (userResult.rows.length === 0) {
        return { success: false, error: 'Invalid token' };
      }
      
      const user = userResult.rows[0];
      
      // Check if token is expired
      const now = new Date();
      const expiry = new Date(user.reset_token_expiry);
      
      if (now > expiry) {
        return { success: false, error: 'Token expired' };
      }
      
      // Hash new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update password and clear token
      await client.query(
        'UPDATE users SET password = $1, reset_token = NULL, reset_token_expiry = NULL, updated_at = NOW() WHERE id = $2',
        [hashedPassword, user.id]
      );
      
      return { success: true };
    } catch (error) {
      console.error('Error resetting password:', error);
      return { success: false, error: 'Failed to reset password' };
    } finally {
      client.release();
    }
  },
  
  // Delete a user
  async delete(userId) {
    const client = await pool.connect();
    
    try {
      // Delete user
      const result = await client.query(
        'DELETE FROM users WHERE id = $1 RETURNING id',
        [userId]
      );
      
      if (result.rows.length === 0) {
        return { success: false, error: 'User not found' };
      }
      
      // Logout if it was the current user
      if (currentUser === userId) {
        currentUser = null;
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting user:', error);
      return { success: false, error: 'Failed to delete user' };
    } finally {
      client.release();
    }
  }
};

// Recordings repository
const recordingsRepo = {
  // Create a new recording
  async create(userId, filename, duration, audioData = null, providedId = null) {
    const client = await pool.connect();
    
    try {
      const recordingId = providedId || generateUUID();
      let filePath = null;
      
      // If audioData is provided, save to disk and store the path
      if (audioData) {
        // In the containerized version, we'd save the file to a persistent volume
        // and store the path in the database instead of the binary data
        const uploadDir = process.env.STORAGE_PATH || './uploads';
        filePath = `${uploadDir}/${recordingId}.webm`;
        
        // Note: In a real implementation, you would write the audioData to disk
        console.log(`Would save audio file to: ${filePath}`);
      }
      
      // Insert recording record
      await client.query(
        `INSERT INTO recordings (id, user_id, filename, duration, file_path, recorded_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [recordingId, userId, filename, duration, filePath, new Date()]
      );
      
      return recordingId;
    } catch (error) {
      console.error('Error creating recording:', error);
      throw error;
    } finally {
      client.release();
    }
  },
  
  // Get all recordings for a user
  async getByUser(userId) {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        `SELECT * FROM recordings WHERE user_id = $1 ORDER BY recorded_at DESC`,
        [userId]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Error getting recordings by user:', error);
      return [];
    } finally {
      client.release();
    }
  },
  
  // Get a specific recording by ID
  async getById(id) {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM recordings WHERE id = $1',
        [id]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error getting recording by ID:', error);
      return null;
    } finally {
      client.release();
    }
  },
  
  // Delete a recording
  async delete(id) {
    const client = await pool.connect();
    
    try {
      // Get file path before deletion
      const pathResult = await client.query(
        'SELECT file_path FROM recordings WHERE id = $1',
        [id]
      );
      
      // Delete recording (cascades to transcriptions and tags)
      const result = await client.query(
        'DELETE FROM recordings WHERE id = $1 RETURNING id',
        [id]
      );
      
      if (result.rows.length === 0) {
        return false;
      }
      
      // Delete file if it exists
      if (pathResult.rows.length > 0 && pathResult.rows[0].file_path) {
        // In a real implementation, you would delete the file from disk
        console.log(`Would delete audio file: ${pathResult.rows[0].file_path}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting recording:', error);
      return false;
    } finally {
      client.release();
    }
  }
};

// Transcriptions repository
const transcriptionsRepo = {
  // Create a new transcription
  async create(recordingId, content, metadata = null) {
    const client = await pool.connect();
    
    try {
      const transcriptionId = generateUUID();
      
      // Insert transcription
      await client.query(
        `INSERT INTO transcriptions (id, recording_id, content, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [transcriptionId, recordingId, content, metadata]
      );
      
      return transcriptionId;
    } catch (error) {
      console.error('Error creating transcription:', error);
      return null;
    } finally {
      client.release();
    }
  },
  
  // Get transcription by recording ID
  async getByRecordingId(recordingId) {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM transcriptions WHERE recording_id = $1',
        [recordingId]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error getting transcription by recording ID:', error);
      return null;
    } finally {
      client.release();
    }
  },
  
  // Update a transcription
  async update(recordingId, content, metadata = null) {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        `UPDATE transcriptions 
         SET content = $1, metadata = $2, updated_at = NOW()
         WHERE recording_id = $3
         RETURNING id`,
        [content, metadata, recordingId]
      );
      
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error updating transcription:', error);
      return false;
    } finally {
      client.release();
    }
  },
  
  // Search transcriptions by content
  async search(userId, searchTerm) {
    const client = await pool.connect();
    
    try {
      // Basic text search
      const result = await client.query(
        `SELECT t.*, r.filename, r.duration, r.recorded_at
         FROM transcriptions t
         JOIN recordings r ON t.recording_id = r.id
         WHERE r.user_id = $1 AND t.content ILIKE $2
         ORDER BY r.recorded_at DESC`,
        [userId, `%${searchTerm}%`]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Error searching transcriptions:', error);
      return [];
    } finally {
      client.release();
    }
  }
};

// Tags repository
const tagsRepo = {
  // Get or create a tag
  async getOrCreate(name) {
    const client = await pool.connect();
    
    try {
      // Check if tag exists
      const existingTag = await client.query(
        'SELECT id FROM tags WHERE name = $1',
        [name]
      );
      
      if (existingTag.rows.length > 0) {
        return existingTag.rows[0].id;
      }
      
      // Create new tag
      const result = await client.query(
        'INSERT INTO tags (id, name, created_at) VALUES ($1, $2, NOW()) RETURNING id',
        [generateUUID(), name]
      );
      
      return result.rows[0].id;
    } catch (error) {
      console.error('Error getting or creating tag:', error);
      throw error;
    } finally {
      client.release();
    }
  },
  
  // Tag a recording
  async tagRecording(recordingId, tagName) {
    const client = await pool.connect();
    
    try {
      // Get or create the tag
      const tagId = await this.getOrCreate(tagName);
      
      // Check if already tagged
      const existingTag = await client.query(
        'SELECT recording_id FROM recording_tags WHERE recording_id = $1 AND tag_id = $2',
        [recordingId, tagId]
      );
      
      if (existingTag.rows.length === 0) {
        // Add tag to recording
        await client.query(
          'INSERT INTO recording_tags (recording_id, tag_id) VALUES ($1, $2)',
          [recordingId, tagId]
        );
      }
      
      return true;
    } catch (error) {
      console.error('Error tagging recording:', error);
      return false;
    } finally {
      client.release();
    }
  },
  
  // Remove a tag from a recording
  async untagRecording(recordingId, tagName) {
    const client = await pool.connect();
    
    try {
      // Find the tag
      const tagResult = await client.query(
        'SELECT id FROM tags WHERE name = $1',
        [tagName]
      );
      
      if (tagResult.rows.length === 0) {
        return false;
      }
      
      // Remove tag
      await client.query(
        'DELETE FROM recording_tags WHERE recording_id = $1 AND tag_id = $2',
        [recordingId, tagResult.rows[0].id]
      );
      
      return true;
    } catch (error) {
      console.error('Error untagging recording:', error);
      return false;
    } finally {
      client.release();
    }
  },
  
  // Get all tags for a recording
  async getByRecordingId(recordingId) {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        `SELECT t.name
         FROM tags t
         JOIN recording_tags rt ON t.id = rt.tag_id
         WHERE rt.recording_id = $1
         ORDER BY t.name`,
        [recordingId]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Error getting tags by recording ID:', error);
      return [];
    } finally {
      client.release();
    }
  },
  
  // Get all recordings with a specific tag
  async getRecordingsByTag(userId, tagName) {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        `SELECT r.*
         FROM recordings r
         JOIN recording_tags rt ON r.id = rt.recording_id
         JOIN tags t ON rt.tag_id = t.id
         WHERE r.user_id = $1 AND t.name = $2
         ORDER BY r.recorded_at DESC`,
        [userId, tagName]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Error getting recordings by tag:', error);
      return [];
    } finally {
      client.release();
    }
  }
};

// Initialize the database connection
initializeDatabase().catch(error => {
  console.error('Failed to initialize database:', error);
});

module.exports = {
  initializeDatabase,
  generateUUID,
  defaultUserId: DEFAULT_USER_ID,
  recordings: recordingsRepo,
  transcriptions: transcriptionsRepo,
  tags: tagsRepo,
  users: usersRepo,
  getCurrentUser: () => usersRepo.getCurrentUser()
};