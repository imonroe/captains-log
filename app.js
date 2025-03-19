// Captain's Log - Main Application JavaScript

// DOM Elements
const recordButton = document.getElementById('recordButton');
const logsButton = document.getElementById('logsButton');
const settingsButton = document.getElementById('settingsButton');
const screens = document.querySelectorAll('.screen');
const recordingScreen = document.getElementById('recordingScreen');
const logsScreen = document.getElementById('logsScreen');
const settingsScreen = document.getElementById('settingsScreen');
const startRecordingBtn = document.getElementById('startRecording');
const stopRecordingBtn = document.getElementById('stopRecording');
const recordingIndicator = document.getElementById('recordingIndicator');
const recordingTime = document.getElementById('recordingTime');
const logsList = document.getElementById('logsList');
const searchInput = document.getElementById('searchInput');
const stardateDisplay = document.getElementById('stardate');

// Application state
let mediaRecorder;
let audioChunks = [];
let recordingStartTime;
let recordingTimer;
let logs = [];

// Initialize the application
function init() {
  // Display current stardate (Star Trek style date)
  updateStardate();
  
  // Set up navigation
  setupNavigation();
  
  // Set up recording functionality
  setupRecording();
  
  // Load existing logs from localStorage
  loadLogs();
  
  // Set up search functionality
  setupSearch();
  
  // Check for PWA install capability
  setupPWA();
}

// Set up navigation between screens
function setupNavigation() {
  const navButtons = [recordButton, logsButton, settingsButton];
  const screenElements = [recordingScreen, logsScreen, settingsScreen];
  
  navButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
      // Update active button
      navButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Show selected screen
      screens.forEach(screen => screen.classList.remove('active'));
      screenElements[index].classList.add('active');
    });
  });
  
  // Set initial active state
  recordButton.classList.add('active');
}

// Set up audio recording functionality
function setupRecording() {
  startRecordingBtn.addEventListener('click', startRecording);
  stopRecordingBtn.addEventListener('click', stopRecording);
}

// Start recording audio
async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    
    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };
    
    mediaRecorder.onstop = processRecording;
    
    // Start recording
    audioChunks = [];
    mediaRecorder.start();
    
    // Update UI
    recordingIndicator.classList.add('recording');
    startRecordingBtn.disabled = true;
    stopRecordingBtn.disabled = false;
    
    // Start timer
    recordingStartTime = Date.now();
    updateRecordingTime();
    recordingTimer = setInterval(updateRecordingTime, 1000);
    
  } catch (error) {
    console.error('Error accessing microphone:', error);
    alert('Error accessing microphone. Please ensure you have granted permission.');
  }
}

// Stop recording audio
function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    
    // Stop all tracks from the stream
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
    
    // Update UI
    recordingIndicator.classList.remove('recording');
    startRecordingBtn.disabled = false;
    stopRecordingBtn.disabled = true;
    
    // Stop timer
    clearInterval(recordingTimer);
  }
}

// Process the recording after stopping
function processRecording() {
  const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
  const audioUrl = URL.createObjectURL(audioBlob);
  
  // For now, we'll just use placeholder text for transcription
  // In a real implementation, this would be sent to a speech-to-text API
  const placeholderTranscription = "This is a placeholder for the transcribed text. In a production version, this would be actual transcribed content from the OpenAI Whisper API or similar service.";
  
  // Create a new log entry
  const newLog = {
    id: generateUUID(),
    date: new Date().toISOString(),
    audioUrl: audioUrl,
    transcript: placeholderTranscription,
    duration: formatTime(Date.now() - recordingStartTime)
  };
  
  // Add to logs array
  logs.unshift(newLog);
  
  // Save logs to localStorage
  saveLogs();
  
  // Update the logs display
  renderLogs();
  
  // Show logs screen
  logsButton.click();
}

// Update the recording time display
function updateRecordingTime() {
  const elapsedTime = Date.now() - recordingStartTime;
  recordingTime.textContent = formatTime(elapsedTime);
}

// Format milliseconds to HH:MM:SS
function formatTime(ms) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));
  
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0')
  ].join(':');
}

// Load logs from localStorage
function loadLogs() {
  const storedLogs = localStorage.getItem('captainsLogs');
  if (storedLogs) {
    logs = JSON.parse(storedLogs);
    renderLogs();
  }
}

// Save logs to localStorage
function saveLogs() {
  localStorage.setItem('captainsLogs', JSON.stringify(logs));
}

// Render logs in the UI
function renderLogs(filteredLogs = null) {
  const logsToRender = filteredLogs || logs;
  logsList.innerHTML = '';
  
  if (logsToRender.length === 0) {
    logsList.innerHTML = '<div class="no-logs">No logs recorded yet.</div>';
    return;
  }
  
  logsToRender.forEach(log => {
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    // Format the date for display
    const logDate = new Date(log.date);
    const formattedDate = logDate.toLocaleDateString() + ' ' + logDate.toLocaleTimeString();
    
    logEntry.innerHTML = `
      <div class="log-date">Stardate ${calculateStardate(logDate)} (${formattedDate})</div>
      <div class="log-preview">${log.transcript.substring(0, 100)}${log.transcript.length > 100 ? '...' : ''}</div>
    `;
    
    // Add click event to show full log
    logEntry.addEventListener('click', () => showLogDetail(log));
    
    logsList.appendChild(logEntry);
  });
}

// Show detailed view of a log
function showLogDetail(log) {
  // This would open a modal or navigate to a detail page
  // For this example, we'll use a simple alert
  alert(`Log Entry: ${new Date(log.date).toLocaleString()}
Duration: ${log.duration}
Transcript: ${log.transcript}`);
  
  // In a real implementation, this would also have audio playback
}

// Set up search functionality
function setupSearch() {
  searchInput.addEventListener('input', () => {
    const searchTerm = searchInput.value.toLowerCase();
    
    if (searchTerm.trim() === '') {
      renderLogs(); // Show all logs if search is empty
      return;
    }
    
    // Filter logs based on the search term
    const filteredLogs = logs.filter(log => 
      log.transcript.toLowerCase().includes(searchTerm)
    );
    
    renderLogs(filteredLogs);
  });
}

// Calculate a Star Trek style stardate
function calculateStardate(date = new Date()) {
  // This is a simple approximation of a stardate
  // In Star Trek: TNG era, stardates are roughly 1000 units per year
  const startYear = 2000; // We'll use 2000 as our reference year
  const yearsFromRef = date.getFullYear() - startYear;
  const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  
  // Calculate stardate: [Years since 2000] * 1000 + [Percentage of year completed] * 1000
  const stardate = yearsFromRef * 1000 + Math.floor(dayOfYear * 1000 / 365);
  
  return stardate.toFixed(1);
}

// Update stardate display
function updateStardate() {
  stardateDisplay.textContent = calculateStardate();
}

// Generate a UUID (for log IDs)
function generateUUID() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

// Set up Progressive Web App capabilities
function setupPWA() {
  // Register service worker for PWA support
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('ServiceWorker registration successful');
        })
        .catch(error => {
          console.error('ServiceWorker registration failed:', error);
        });
    });
  }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);