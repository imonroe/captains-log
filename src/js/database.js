/**
 * Database module - Handles SQLite database operations for the Captain's Log application
 * 
 * This module uses an IndexedDB wrapper around SQLite for browser compatibility.
 * This implementation is designed to work in the browser environment.
 */

// State to store users, recordings and transcriptions
const dbState = {
  users: [],
  logs: [],
  recordings: [],
  transcriptions: [],
  tags: [],
  recording_tags: [],
  initialized: false,
  defaultUserId: '00000000-0000-0000-0000-000000000000',
  currentUser: null
};

// Initialize the database
async function initializeDatabase() {
  console.log('Initializing in-memory database...');
  
  // Create a default user
  if (!dbState.initialized) {
    console.log('Creating default admin user...');
    
    // Add default admin user (for demo purposes)
    dbState.users = [];
    const adminId = '00000000-0000-0000-0000-000000000000'; // Same as defaultUserId
    
    // Create admin user
    const adminUser = {
      id: adminId,
      email: 'captain@starfleet.com',
      password: await hashPassword('enterprise'), // In a real app, would be properly hashed
      name: 'Captain',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      settings: {
        audioQuality: 'high',
        silenceThreshold: 30
      },
      resetToken: null,
      resetTokenExpiry: null,
      lastLoginAt: null
    };
    
    dbState.users.push(adminUser);
    console.log('Default admin user created');
    
    // Mark as initialized
    dbState.initialized = true;
    
    console.log('Database initialized successfully');
  }
  
  return true;
}

// Generate a UUID
function generateUUID() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

// Browser-compatible implementation for recordings
const recordingsRepo = {
  // Create a new recording
  async create(userId, filename, duration, audioData = null, providedId = null) {
    const recordingId = providedId || generateUUID();
    console.log(`Creating recording with ID: ${recordingId} (${providedId ? 'provided' : 'generated'})`);
    
    const newRecording = {
      id: recordingId,
      user_id: userId,
      filename,
      duration,
      audio_data: audioData,
      recorded_at: new Date().toISOString()
    };
    
    // Store in memory
    dbState.recordings = dbState.recordings || [];
    dbState.recordings.push(newRecording);
    
    return recordingId;
  },
  
  // Get all recordings for a user
  async getByUser(userId) {
    if (!dbState.recordings) return [];
    
    return dbState.recordings
      .filter(recording => recording.user_id === userId)
      .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));
  },
  
  // Get a specific recording by ID
  async getById(id) {
    if (!dbState.recordings) return null;
    
    return dbState.recordings.find(recording => recording.id === id) || null;
  },
  
  // Delete a recording
  async delete(id) {
    if (!dbState.recordings) return false;
    
    // Filter out the recording to delete
    dbState.recordings = dbState.recordings.filter(recording => recording.id !== id);
    
    // Also delete any transcriptions
    if (dbState.transcriptions) {
      dbState.transcriptions = dbState.transcriptions.filter(
        transcription => transcription.recording_id !== id
      );
    }
    
    // And delete any tags
    if (dbState.recording_tags) {
      dbState.recording_tags = dbState.recording_tags.filter(
        tag => tag.recording_id !== id
      );
    }
    
    return true;
  }
};

// Browser-compatible implementation for transcriptions
const transcriptionsRepo = {
  // Create a new transcription
  async create(recordingId, content, metadata = null) {
    const transcriptionId = generateUUID();
    const newTranscription = {
      id: transcriptionId,
      recording_id: recordingId,
      content,
      metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Store in memory
    dbState.transcriptions = dbState.transcriptions || [];
    dbState.transcriptions.push(newTranscription);
    
    return transcriptionId;
  },
  
  // Get transcription by recording ID
  async getByRecordingId(recordingId) {
    if (!dbState.transcriptions) return null;
    
    return dbState.transcriptions.find(
      transcription => transcription.recording_id === recordingId
    ) || null;
  },
  
  // Update a transcription
  async update(id, content, metadata = null) {
    if (!dbState.transcriptions) return false;
    
    const index = dbState.transcriptions.findIndex(
      transcription => transcription.id === id
    );
    
    if (index === -1) return false;
    
    dbState.transcriptions[index] = {
      ...dbState.transcriptions[index],
      content,
      metadata: metadata || dbState.transcriptions[index].metadata,
      updated_at: new Date().toISOString()
    };
    
    return true;
  },
  
  // Search transcriptions by content
  async search(userId, searchTerm) {
    if (!dbState.transcriptions || !dbState.recordings) return [];
    
    // Get all recordings for this user
    const userRecordings = await recordingsRepo.getByUser(userId);
    const userRecordingIds = userRecordings.map(recording => recording.id);
    
    // Find transcriptions for these recordings that match the search term
    const matchingTranscriptions = dbState.transcriptions
      .filter(transcription => 
        userRecordingIds.includes(transcription.recording_id) &&
        transcription.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    // Join with recording information
    return matchingTranscriptions.map(transcription => {
      const recording = userRecordings.find(
        r => r.id === transcription.recording_id
      );
      
      return {
        ...transcription,
        filename: recording ? recording.filename : null,
        duration: recording ? recording.duration : null,
        recorded_at: recording ? recording.recorded_at : null
      };
    });
  }
};

// Browser-compatible implementation for tags
const tagsRepo = {
  // Create a new tag if it doesn't exist
  async getOrCreate(name) {
    dbState.tags = dbState.tags || [];
    
    // Check if tag already exists
    let tag = dbState.tags.find(t => t.name === name);
    
    if (tag) {
      return tag.id;
    }
    
    // Create new tag
    const tagId = generateUUID();
    tag = {
      id: tagId,
      name,
      created_at: new Date().toISOString()
    };
    
    dbState.tags.push(tag);
    return tagId;
  },
  
  // Add a tag to a recording
  async tagRecording(recordingId, tagName) {
    const tagId = await this.getOrCreate(tagName);
    
    dbState.recording_tags = dbState.recording_tags || [];
    
    // Check if already tagged
    const exists = dbState.recording_tags.some(
      rt => rt.recording_id === recordingId && rt.tag_id === tagId
    );
    
    if (!exists) {
      dbState.recording_tags.push({
        recording_id: recordingId,
        tag_id: tagId
      });
    }
    
    return true;
  },
  
  // Remove a tag from a recording
  async untagRecording(recordingId, tagName) {
    if (!dbState.tags || !dbState.recording_tags) return false;
    
    const tag = dbState.tags.find(t => t.name === tagName);
    if (!tag) return false;
    
    dbState.recording_tags = dbState.recording_tags.filter(
      rt => !(rt.recording_id === recordingId && rt.tag_id === tag.id)
    );
    
    return true;
  },
  
  // Get all tags for a recording
  async getByRecordingId(recordingId) {
    if (!dbState.tags || !dbState.recording_tags) return [];
    
    const tagIds = dbState.recording_tags
      .filter(rt => rt.recording_id === recordingId)
      .map(rt => rt.tag_id);
    
    return dbState.tags
      .filter(tag => tagIds.includes(tag.id))
      .map(tag => ({ name: tag.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
  
  // Get all recordings with a specific tag
  async getRecordingsByTag(userId, tagName) {
    if (!dbState.tags || !dbState.recording_tags || !dbState.recordings) 
      return [];
    
    const tag = dbState.tags.find(t => t.name === tagName);
    if (!tag) return [];
    
    const recordingIds = dbState.recording_tags
      .filter(rt => rt.tag_id === tag.id)
      .map(rt => rt.recording_id);
    
    return dbState.recordings
      .filter(r => 
        recordingIds.includes(r.id) && 
        r.user_id === userId
      )
      .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));
  }
};

// Initialize the database
initializeDatabase().catch(error => {
  console.error('Failed to initialize database:', error);
});

// Utility function to hash passwords
async function hashPassword(password) {
  // In a production environment, you would use a proper password hashing library
  // For this demo, we'll use a simple SHA-256 hash via the Web Crypto API
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Browser-compatible implementation for users
const usersRepo = {
  // Create a new user
  async create(email, password, name, providedId = null) {
    // Check if email already exists
    if (await this.findByEmail(email)) {
      return { success: false, error: 'Email already in use' };
    }
    
    const userId = providedId || generateUUID();
    const hashedPassword = await hashPassword(password);
    
    const newUser = {
      id: userId,
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name || email.split('@')[0], // Use part before @ as default name
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      settings: {
        audioQuality: 'medium',
        silenceThreshold: 30
      },
      resetToken: null,
      resetTokenExpiry: null,
      lastLoginAt: null
    };
    
    // Store in memory
    dbState.users = dbState.users || [];
    dbState.users.push(newUser);
    
    // Return success but without password
    const { password: _, ...userWithoutPassword } = newUser;
    return { 
      success: true, 
      user: userWithoutPassword 
    };
  },
  
  // Authenticate a user
  async authenticate(email, password) {
    const user = await this.findByEmail(email);
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    const hashedPassword = await hashPassword(password);
    if (user.password !== hashedPassword) {
      return { success: false, error: 'Invalid password' };
    }
    
    // Update last login
    user.lastLoginAt = new Date().toISOString();
    
    // Set as current user
    dbState.currentUser = user.id;
    
    // Don't return the password
    const { password: _, ...userWithoutPassword } = user;
    return { 
      success: true, 
      user: userWithoutPassword 
    };
  },
  
  // Logout current user
  logout() {
    dbState.currentUser = null;
    return true;
  },
  
  // Get current user
  getCurrentUser() {
    if (!dbState.currentUser) return null;
    
    const user = this.findById(dbState.currentUser);
    if (!user) return null;
    
    // Don't return the password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },
  
  // Find user by ID
  findById(id) {
    if (!dbState.users) return null;
    return dbState.users.find(user => user.id === id) || null;
  },
  
  // Find user by email
  findByEmail(email) {
    if (!dbState.users) return null;
    return dbState.users.find(user => user.email.toLowerCase() === email.toLowerCase()) || null;
  },
  
  // Update user profile
  async updateProfile(userId, updates) {
    const user = this.findById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    // Check if trying to update to an email that's already in use by another user
    if (updates.email && updates.email !== user.email) {
      const existingUser = await this.findByEmail(updates.email);
      if (existingUser && existingUser.id !== userId) {
        return { success: false, error: 'Email already in use' };
      }
    }
    
    // Update user fields
    Object.assign(user, {
      ...updates,
      updated_at: new Date().toISOString()
    });
    
    // If updating password, hash it
    if (updates.password) {
      user.password = await hashPassword(updates.password);
    }
    
    // Don't return the password
    const { password: _, ...userWithoutPassword } = user;
    return { 
      success: true, 
      user: userWithoutPassword 
    };
  },
  
  // Update user settings
  updateSettings(userId, settings) {
    const user = this.findById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    user.settings = {
      ...user.settings,
      ...settings,
      updated_at: new Date().toISOString()
    };
    
    return { success: true };
  },
  
  // Generate password reset token
  async generateResetToken(email) {
    const user = await this.findByEmail(email);
    if (!user) {
      // For security, don't reveal if email exists
      return { success: true };
    }
    
    // Generate a token
    const resetToken = generateUUID();
    
    // Set expiry for 24 hours
    const now = new Date();
    const resetTokenExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    
    // Save to user
    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    
    // In a real app, you would send an email with the reset link
    console.log(`Password reset token for ${email}: ${resetToken}`);
    
    return { success: true };
  },
  
  // Reset password using token
  async resetPassword(token, newPassword) {
    if (!dbState.users) {
      return { success: false, error: 'Invalid token' };
    }
    
    const user = dbState.users.find(user => user.resetToken === token);
    if (!user) {
      return { success: false, error: 'Invalid token' };
    }
    
    // Check if token is expired
    const now = new Date();
    const expiry = new Date(user.resetTokenExpiry);
    if (now > expiry) {
      return { success: false, error: 'Token expired' };
    }
    
    // Update password
    user.password = await hashPassword(newPassword);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    user.updated_at = new Date().toISOString();
    
    return { success: true };
  },
  
  // Delete a user (GDPR compliance)
  async delete(userId) {
    if (!dbState.users) return { success: false, error: 'User not found' };
    
    const initialLength = dbState.users.length;
    dbState.users = dbState.users.filter(user => user.id !== userId);
    
    if (dbState.users.length === initialLength) {
      return { success: false, error: 'User not found' };
    }
    
    // Also clean up all user data
    if (dbState.recordings) {
      dbState.recordings = dbState.recordings.filter(recording => recording.user_id !== userId);
    }
    
    // Logout if it was the current user
    if (dbState.currentUser === userId) {
      dbState.currentUser = null;
    }
    
    return { success: true };
  }
};

module.exports = {
  initializeDatabase,
  generateUUID,
  defaultUserId: dbState.defaultUserId,
  recordings: recordingsRepo,
  transcriptions: transcriptionsRepo,
  tags: tagsRepo,
  users: usersRepo,
  getCurrentUser: () => usersRepo.getCurrentUser()
};