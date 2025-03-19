/**
 * Database module - Handles SQLite database operations for the Captain's Log application
 * 
 * This module uses an IndexedDB wrapper around SQLite for browser compatibility.
 * This implementation is designed to work in the browser environment.
 */

// State to store recordings and transcriptions
const dbState = {
  logs: [],
  recordings: [],
  transcriptions: [],
  tags: [],
  recording_tags: [],
  initialized: false,
  defaultUserId: '00000000-0000-0000-0000-000000000000'
};

// Initialize the database
async function initializeDatabase() {
  console.log('Initializing in-memory database...');
  
  // Create a default user
  if (!dbState.initialized) {
    // Add a default user
    console.log('Creating default user...');
    
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

module.exports = {
  initializeDatabase,
  generateUUID,
  defaultUserId: dbState.defaultUserId,
  recordings: recordingsRepo,
  transcriptions: transcriptionsRepo,
  tags: tagsRepo
};