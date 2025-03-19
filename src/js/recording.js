/**
 * Recording module - Functions for audio recording functionality
 */

const { formatTime } = require('./utils');
const { state, addLog, saveLogs } = require('./store');
const { recordings, transcriptions, generateUUID } = require('./database');
const { transcribeAudio } = require('./services/whisper');

// Default user ID (would be set from login in a full implementation)
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000';

// Set up audio recording functionality
function setupRecording() {
  const { ui } = state;
  
  ui.startRecordingBtn.addEventListener('click', startRecording);
  ui.stopRecordingBtn.addEventListener('click', stopRecording);
}

// Start recording audio
async function startRecording() {
  try {
    const { ui } = state;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.mediaRecorder = new MediaRecorder(stream);
    
    state.mediaRecorder.ondataavailable = (event) => {
      state.audioChunks.push(event.data);
    };
    
    state.mediaRecorder.onstop = processRecording;
    
    // Start recording
    state.audioChunks = [];
    state.mediaRecorder.start();
    
    // Update UI
    ui.recordingIndicator.classList.add('recording');
    ui.startRecordingBtn.disabled = true;
    ui.stopRecordingBtn.disabled = false;
    
    // Start timer
    state.recordingStartTime = Date.now();
    updateRecordingTime();
    state.recordingTimer = setInterval(updateRecordingTime, 1000);
    
  } catch (error) {
    console.error('Error accessing microphone:', error);
    alert('Error accessing microphone. Please ensure you have granted permission.');
  }
}

// Stop recording audio
function stopRecording() {
  const { ui } = state;
  
  if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
    state.mediaRecorder.stop();
    
    // Stop all tracks from the stream
    state.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    
    // Update UI
    ui.recordingIndicator.classList.remove('recording');
    ui.startRecordingBtn.disabled = false;
    ui.stopRecordingBtn.disabled = true;
    
    // Stop timer
    clearInterval(state.recordingTimer);
  }
}

// Process the recording after stopping
async function processRecording() {
  console.log('Processing recording...');
  console.log('Audio chunks:', state.audioChunks.length);
  
  const { ui } = state;
  const audioBlob = new Blob(state.audioChunks, { type: 'audio/webm' });
  const audioUrl = URL.createObjectURL(audioBlob);
  
  console.log('Created audio URL:', audioUrl);
  
  // Default transcription message while we're processing
  let transcriptionText = "Transcription in progress...";
  let transcriptionMetadata = { status: 'processing' };
  
  // Calculate duration
  const durationMs = Date.now() - state.recordingStartTime;
  const formattedDuration = formatTime(durationMs);
  
  // Generate a unique ID for this recording
  const recordingId = generateUUID();
  
  try {
    // Generate a filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `recording-${timestamp}.webm`;
    
    // Create a new log entry for the UI first (with processing status)
    const newLog = {
      id: recordingId,
      date: new Date().toISOString(),
      audioUrl: audioUrl,
      transcript: transcriptionText,
      duration: formattedDuration,
      processing: true
    };
    
    console.log('Created initial log entry:', newLog);
    
    // Add to logs array for UI display
    addLog(newLog);
    saveLogs();
    
    // Also save to the in-memory database
    try {
      // Convert audio blob to array buffer for storage
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // Save recording to database
      await recordings.create(
        DEFAULT_USER_ID,
        filename,
        formattedDuration,
        arrayBuffer,
        recordingId // Use the pre-generated ID
      );
      
      // Save initial transcription to database
      await transcriptions.create(
        recordingId,
        transcriptionText,
        transcriptionMetadata
      );
      
      console.log('Recording saved to database with initial transcription');
    } catch (dbError) {
      console.error('Error saving to database (non-critical):', dbError);
    }
    
    // Refresh the logs display to show the "processing" state
    const { setupLogsView } = require('./logs');
    setupLogsView();
    
    // Show logs screen while transcription is processing
    console.log('Switching to logs screen while transcription processes');
    ui.logsButton.click();
    
    // Now start the actual transcription with Whisper API
    console.log('Starting transcription with Whisper API...');
    const transcriptionResult = await transcribeAudio(audioBlob);
    console.log('Transcription result:', transcriptionResult);
    
    if (!transcriptionResult.error) {
      // Update the transcription with the result from Whisper
      transcriptionText = transcriptionResult.transcription;
      transcriptionMetadata = transcriptionResult.metadata || { status: 'completed' };
      
      // Update the log entry with the transcription
      const updatedLog = {
        ...newLog,
        transcript: transcriptionText,
        processing: false
      };
      
      // Find and update the log in the state.logs array
      const logIndex = state.logs.findIndex(log => log.id === recordingId);
      if (logIndex !== -1) {
        state.logs[logIndex] = updatedLog;
        saveLogs();
        console.log('Updated log with transcription:', updatedLog);
      }
      
      // Update the database transcription
      try {
        await transcriptions.update(
          recordingId,
          transcriptionText,
          transcriptionMetadata
        );
        console.log('Database transcription updated successfully');
      } catch (updateError) {
        console.error('Error updating transcription in database:', updateError);
      }
      
      // Refresh the logs display again with the updated transcription
      setupLogsView();
    } else {
      console.error('Transcription failed:', transcriptionResult.message);
      
      // Update with error status but keep the placeholder
      const errorLog = {
        ...newLog,
        transcript: transcriptionResult.transcription,
        processing: false,
        error: true
      };
      
      // Find and update the log in the state.logs array
      const logIndex = state.logs.findIndex(log => log.id === recordingId);
      if (logIndex !== -1) {
        state.logs[logIndex] = errorLog;
        saveLogs();
      }
      
      // Update the database transcription with error status
      try {
        await transcriptions.update(
          recordingId,
          transcriptionResult.transcription,
          { status: 'error', message: transcriptionResult.message }
        );
      } catch (updateError) {
        console.error('Error updating failed transcription in database:', updateError);
      }
      
      // Refresh the logs display
      setupLogsView();
    }
    
  } catch (error) {
    console.error('Critical error in recording process:', error);
    
    // Last resort fallback - create a basic log with error status
    try {
      const fallbackLog = {
        id: recordingId,
        date: new Date().toISOString(),
        audioUrl: audioUrl,
        transcript: "Transcription failed. The audio was recorded successfully and can still be played back.",
        duration: formattedDuration,
        error: true,
        processing: false
      };
      
      // See if we already added this log
      const existingIndex = state.logs.findIndex(log => log.id === recordingId);
      if (existingIndex !== -1) {
        state.logs[existingIndex] = fallbackLog;
      } else {
        addLog(fallbackLog);
      }
      
      saveLogs();
      console.log('Used fallback method to save recording with error status');
      
      // Refresh the logs display
      const { setupLogsView } = require('./logs');
      setupLogsView();
      
      // Navigate to logs screen
      ui.logsButton.click();
    } catch (e) {
      console.error('Complete failure to save recording:', e);
      alert('Failed to save recording. Please try again.');
    }
  }
}

// Update the recording time display
function updateRecordingTime() {
  const elapsedTime = Date.now() - state.recordingStartTime;
  state.ui.recordingTime.textContent = formatTime(elapsedTime);
}

module.exports = {
  setupRecording,
  startRecording,
  stopRecording
};