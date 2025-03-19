/**
 * Logs module - Functions for managing and displaying log entries
 */

const { calculateStardate } = require('./utils');
const { state, removeLog } = require('./store');
const { recordings, transcriptions } = require('./database');

// Default user ID (would be set from login in a full implementation)
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000';

// Set up the logs view
function setupLogsView(logsToRender = null) {
  console.log('Setting up logs view...');
  const { ui } = state;
  const logs = logsToRender || state.logs;
  
  console.log('Logs to render:', logs.length, logs);
  
  if (!ui.logsList) {
    console.error('logsList element not found in the DOM!');
    return;
  }
  
  ui.logsList.innerHTML = '';
  
  if (!logs || logs.length === 0) {
    console.log('No logs to display, showing empty state');
    ui.logsList.innerHTML = '<div class="no-logs">No logs recorded yet.</div>';
    return;
  }
  
  console.log(`Rendering ${logs.length} logs`);
  
  logs.forEach(log => {
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    // Format the date for display
    const logDate = new Date(log.date);
    const formattedDate = logDate.toLocaleDateString() + ' ' + logDate.toLocaleTimeString();
    
    // Create log entry HTML with status indicators
    let statusClass = '';
    let statusIndicator = '';
    
    if (log.processing) {
      statusClass = 'processing';
      statusIndicator = '<div class="log-status processing">Transcribing...</div>';
    } else if (log.error) {
      statusClass = 'error';
      statusIndicator = '<div class="log-status error">Transcription failed</div>';
    }
    
    logEntry.className = `log-entry ${statusClass}`;
    logEntry.innerHTML = `
      <div class="log-date">Stardate ${calculateStardate(logDate)} (${formattedDate})</div>
      ${statusIndicator}
      <div class="log-preview">${log.transcript.substring(0, 100)}${log.transcript.length > 100 ? '...' : ''}</div>
    `;
    
    // Add click event to show full log
    logEntry.addEventListener('click', () => showLogDetail(log));
    
    // Add to DOM
    ui.logsList.appendChild(logEntry);
  });
  
  console.log('Logs view setup complete');
}

// Show detailed view of a log
function showLogDetail(log) {
  // Create a modal for displaying log details with audio playback
  const modal = document.createElement('div');
  modal.className = 'lcars-modal';
  
  // Create modal content with appropriate status
  let statusHtml = '';
  
  if (log.processing) {
    statusHtml = `
      <div class="log-status-banner processing">
        <div class="status-icon"></div>
        <div class="status-text">Transcription in progress...</div>
      </div>
    `;
  } else if (log.error) {
    statusHtml = `
      <div class="log-status-banner error">
        <div class="status-icon"></div>
        <div class="status-text">Transcription failed. The audio was recorded successfully and can still be played back.</div>
      </div>
    `;
  }
  
  modal.innerHTML = `
    <div class="lcars-modal-content">
      <div class="lcars-modal-header">
        <div class="lcars-corner modal-top-left"></div>
        <div class="lcars-title">LOG ENTRY: STARDATE ${calculateStardate(new Date(log.date))}</div>
        <div class="lcars-corner modal-top-right"></div>
        <div class="lcars-modal-close">&times;</div>
      </div>
      <div class="lcars-modal-body">
        <div class="log-date">${new Date(log.date).toLocaleString()}</div>
        <div class="log-duration">Duration: ${log.duration}</div>
        ${statusHtml}
        <div class="log-audio">
          ${log.audioUrl ? `<audio controls src="${log.audioUrl}"></audio>` : 'No audio available'}
        </div>
        <div class="log-transcript">${log.transcript}</div>
        <div class="log-actions">
          <button id="deleteLogBtn" class="lcars-control-button delete" data-log-id="${log.id}">Delete Log</button>
        </div>
      </div>
    </div>
  `;
  
  // Add modal to the document
  document.body.appendChild(modal);
  
  // Make modal visible
  setTimeout(() => modal.classList.add('active'), 10);
  
  // Add event listener to close button
  modal.querySelector('.lcars-modal-close').addEventListener('click', () => {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 300); // Wait for animation to complete
  });
  
  // Also close when clicking outside the modal content
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 300);
    }
  });
  
  // Add event listener to delete button
  const deleteButton = modal.querySelector('#deleteLogBtn');
  if (deleteButton) {
    deleteButton.addEventListener('click', async () => {
      const logId = deleteButton.getAttribute('data-log-id');
      if (logId) {
        // Ask for confirmation
        const confirmDelete = confirm('Are you sure you want to delete this log? This action cannot be undone.');
        
        if (confirmDelete) {
          console.log(`Deleting log with ID: ${logId}`);
          const deleted = await deleteLog(logId);
          
          if (deleted) {
            // Close the modal
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
            
            // Refresh the logs view
            setupLogsView();
          } else {
            alert('Failed to delete log. Please try again.');
          }
        }
      }
    });
  }
}

// Load logs from database
async function loadLogsFromDatabase() {
  try {
    // Get all recordings for the user
    const dbRecordings = await recordings.getByUser(DEFAULT_USER_ID);
    
    if (!dbRecordings || dbRecordings.length === 0) {
      console.log('No recordings found in database');
      return [];
    }
    
    // Get transcriptions for each recording
    const logs = await Promise.all(dbRecordings.map(async (recording) => {
      const transcription = await transcriptions.getByRecordingId(recording.id);
      
      // Create URL for audio blob if audio_data exists
      let audioUrl = null;
      if (recording.audio_data) {
        const blob = new Blob([recording.audio_data], { type: 'audio/webm' });
        audioUrl = URL.createObjectURL(blob);
      }
      
      return {
        id: recording.id,
        date: recording.recorded_at,
        audioUrl: audioUrl,
        transcript: transcription ? transcription.content : 'No transcription available',
        duration: recording.duration
      };
    }));
    
    console.log(`Loaded ${logs.length} logs from database`);
    return logs;
  } catch (error) {
    console.error('Error loading logs from database:', error);
    return [];
  }
}

// Search logs in database
async function searchLogs(searchTerm) {
  try {
    const results = await transcriptions.search(DEFAULT_USER_ID, searchTerm);
    
    if (!results || results.length === 0) {
      return [];
    }
    
    // Format results for display
    const logs = results.map(result => {
      return {
        id: result.recording_id,
        date: result.recorded_at,
        audioUrl: null, // We'd need to load the audio blob separately
        transcript: result.content,
        duration: result.duration
      };
    });
    
    return logs;
  } catch (error) {
    console.error('Error searching logs:', error);
    return [];
  }
}

// Delete a log
async function deleteLog(logId) {
  console.log(`Deleting log with ID: ${logId}`);
  
  try {
    // First try to delete from database
    try {
      // Delete recording and associated transcription
      await recordings.delete(logId);
      console.log('Deleted from database successfully');
    } catch (dbError) {
      console.error('Failed to delete from database:', dbError);
      // Continue to delete from local state even if database delete fails
    }
    
    // Remove from state and localStorage
    const removed = removeLog(logId);
    if (removed) {
      console.log('Log removed from state and localStorage');
      return true;
    } else {
      console.error('Log not found in state');
      return false;
    }
  } catch (error) {
    console.error('Error deleting log:', error);
    return false;
  }
}

module.exports = {
  setupLogsView,
  showLogDetail,
  loadLogsFromDatabase,
  searchLogs,
  deleteLog
};