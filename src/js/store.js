/**
 * Store module - Centralized state management to avoid circular dependencies
 */

// Application state
const state = {
  // Recording state
  mediaRecorder: null,
  audioChunks: [],
  recordingStartTime: null,
  recordingTimer: null,
  
  // Logs state
  logs: [],
  
  // UI references (populated during initialization)
  ui: {
    recordButton: null,
    logsButton: null,
    settingsButton: null,
    screens: null,
    recordingScreen: null,
    logsScreen: null,
    settingsScreen: null,
    startRecordingBtn: null,
    stopRecordingBtn: null,
    recordingIndicator: null,
    recordingTime: null,
    logsList: null,
    searchInput: null,
    stardateDisplay: null
  }
};

// Add a log entry
function addLog(log) {
  state.logs.unshift(log);
}

// Remove a log entry by ID
function removeLog(logId) {
  console.log('Removing log from state:', logId);
  const initialLength = state.logs.length;
  state.logs = state.logs.filter(log => log.id !== logId);
  
  // Check if any logs were removed
  const removed = initialLength > state.logs.length;
  
  if (removed) {
    // Save updated logs to localStorage
    saveLogs();
    return true;
  }
  
  return false;
}

// Clear all logs
function clearAllLogs() {
  console.log('Clearing all logs from state');
  try {
    // Clear the logs array
    state.logs = [];
    
    // Save empty logs to localStorage
    saveLogs();
    
    // Also try to clear all recordings from database
    try {
      // In a real app with a server, we would delete all recordings from the database here
      console.log('Database cleanup would happen here in a server environment');
    } catch (dbError) {
      console.error('Failed to clear database:', dbError);
      // Continue anyway as localStorage is cleared
    }
    
    return true;
  } catch (error) {
    console.error('Error clearing all logs:', error);
    return false;
  }
}

// Save logs to localStorage
function saveLogs() {
  localStorage.setItem('captainsLogs', JSON.stringify(state.logs));
}

// Load logs from database, fallback to localStorage
async function loadLogs() {
  try {
    // Import here to avoid circular dependencies
    const { loadLogsFromDatabase } = require('./logs');
    
    // First try to load from database
    const dbLogs = await loadLogsFromDatabase();
    
    if (dbLogs && dbLogs.length > 0) {
      // Update state with database logs
      state.logs.length = 0;
      state.logs.push(...dbLogs);
      
      // Also update localStorage for backup/cache
      localStorage.setItem('captainsLogs', JSON.stringify(dbLogs));
      console.log(`Loaded ${dbLogs.length} logs from database`);
      return;
    }
    
    // If no database logs, fall back to localStorage
    const storedLogs = localStorage.getItem('captainsLogs');
    if (storedLogs) {
      // Parse stored logs and update logs array
      const parsedLogs = JSON.parse(storedLogs);
      state.logs.length = 0; // Clear array
      state.logs.push(...parsedLogs); // Add all items back
      console.log(`Loaded ${parsedLogs.length} logs from localStorage`);
    } else {
      console.log('No logs found in localStorage');
    }
    
    // After loading, render logs to update the UI
    const { setupLogsView } = require('./logs');
    setupLogsView();
    
  } catch (error) {
    console.error('Error loading logs:', error);
    
    // If everything fails, try localStorage as last resort
    const storedLogs = localStorage.getItem('captainsLogs');
    if (storedLogs) {
      const parsedLogs = JSON.parse(storedLogs);
      state.logs.length = 0;
      state.logs.push(...parsedLogs);
      console.log(`Loaded ${parsedLogs.length} logs from localStorage (fallback)`);
      
      // Render the logs after loading from fallback
      const { setupLogsView } = require('./logs');
      setupLogsView();
    }
  }
}

// Initialize UI references
function initializeUI() {
  const ui = state.ui;
  
  ui.recordButton = document.getElementById('recordButton');
  ui.logsButton = document.getElementById('logsButton');
  ui.settingsButton = document.getElementById('settingsButton');
  ui.screens = document.querySelectorAll('.screen');
  ui.recordingScreen = document.getElementById('recordingScreen');
  ui.logsScreen = document.getElementById('logsScreen');
  ui.settingsScreen = document.getElementById('settingsScreen');
  ui.startRecordingBtn = document.getElementById('startRecording');
  ui.stopRecordingBtn = document.getElementById('stopRecording');
  ui.recordingIndicator = document.getElementById('recordingIndicator');
  ui.recordingTime = document.getElementById('recordingTime');
  ui.logsList = document.getElementById('logsList');
  ui.searchInput = document.getElementById('searchInput');
  ui.stardateDisplay = document.getElementById('stardate');
}

module.exports = {
  state,
  addLog,
  removeLog,
  clearAllLogs,
  saveLogs,
  loadLogs,
  initializeUI
};