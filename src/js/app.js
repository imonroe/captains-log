// Require styles - direct import so webpack can handle it
require('!style-loader!css-loader!sass-loader!../scss/styles.scss');

// Require modules
const { calculateStardate } = require('./utils');
const { setupRecording } = require('./recording');
const { setupLogsView } = require('./logs');
const { state, initializeUI, loadLogs, clearAllLogs } = require('./store');
const { loadApiKey, saveApiKey, isApiKeyConfigured } = require('./services/settings');
const { initAuthUI } = require('./auth-ui');
const { getCurrentUser } = require('./database');

// Initialize the application
function init() {
  console.log('Initializing Captain\'s Log application...');
  
  // Initialize Auth UI first
  initAuthUI();
  console.log('Auth UI initialized');
  
  // Initialize DOM references for main app UI
  initializeUI();
  console.log('App UI initialized');
  
  // Display current stardate (Star Trek style date)
  updateStardate();
  
  // Set up navigation
  setupNavigation();
  console.log('Navigation setup complete');
  
  // Set up recording functionality
  setupRecording();
  console.log('Recording setup complete');
  
  // Load existing logs from localStorage first
  loadLogs().then(() => {
    console.log('Logs loaded, setting up logs view');
    
    // Set up logs view AFTER logs are loaded
    setupLogsView();
    console.log('Logs view setup complete');
  }).catch(err => {
    console.error('Error loading logs:', err);
    // Still set up logs view even if loading fails
    setupLogsView();
  });
  
  // Set up search functionality
  setupSearch();
  
  // Set up settings functionality
  setupSettings();
  
  // Set up logs management functionality
  setupLogsManagement();
  
  // Check for PWA install capability
  setupPWA();
  
  console.log('Application initialization complete');
}

// Set up navigation between screens
function setupNavigation() {
  const { ui } = state;
  const navButtons = [ui.recordButton, ui.logsButton, ui.settingsButton];
  const screenElements = [ui.recordingScreen, ui.logsScreen, ui.settingsScreen];
  
  navButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
      // Update active button
      navButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Show selected screen
      ui.screens.forEach(screen => screen.classList.remove('active'));
      screenElements[index].classList.add('active');
    });
  });
  
  // Set initial active state
  ui.recordButton.classList.add('active');
}

// Update stardate display
function updateStardate() {
  state.ui.stardateDisplay.textContent = calculateStardate();
}

// Set up search functionality
function setupSearch() {
  const { searchLogs } = require('./logs');
  
  // Debounce function to prevent too many DB queries
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
  
  // Debounced search function
  const debouncedSearch = debounce(async (searchTerm) => {
    if (searchTerm.trim() === '') {
      // Show all logs if search is empty
      setupLogsView(state.logs);
      return;
    }
    
    try {
      // Search in the database
      const searchResults = await searchLogs(searchTerm);
      
      if (searchResults && searchResults.length > 0) {
        setupLogsView(searchResults);
      } else {
        // Fall back to client-side search if no DB results
        const filteredLogs = state.logs.filter(log => 
          log.transcript.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setupLogsView(filteredLogs);
      }
    } catch (error) {
      console.error('Error searching logs:', error);
      
      // Fall back to client-side search on error
      const filteredLogs = state.logs.filter(log => 
        log.transcript.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setupLogsView(filteredLogs);
    }
  }, 300); // 300ms debounce
  
  // Add event listener
  state.ui.searchInput.addEventListener('input', (event) => {
    const searchTerm = event.target.value;
    debouncedSearch(searchTerm);
  });
}

// Set up settings functionality
function setupSettings() {
  const apiKeyInput = document.getElementById('openaiApiKey');
  const toggleApiKeyBtn = document.getElementById('toggleApiKey');
  const saveApiKeyBtn = document.getElementById('saveApiKey');
  
  // Load the API key if it exists
  const existingApiKey = loadApiKey();
  if (existingApiKey) {
    apiKeyInput.value = existingApiKey;
    console.log('API key loaded from settings');
  }
  
  // Toggle API key visibility
  toggleApiKeyBtn.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      toggleApiKeyBtn.textContent = 'Hide';
    } else {
      apiKeyInput.type = 'password';
      toggleApiKeyBtn.textContent = 'Show';
    }
  });
  
  // Save API key
  saveApiKeyBtn.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      alert('Please enter a valid OpenAI API key');
      return;
    }
    
    const success = saveApiKey(apiKey);
    
    if (success) {
      alert('API key saved successfully!');
      console.log('API key saved successfully');
    } else {
      alert('Failed to save API key. Please try again.');
      console.error('Failed to save API key');
    }
  });
}

// Set up logs management functionality
function setupLogsManagement() {
  const clearAllLogsBtn = document.getElementById('clearAllLogsBtn');
  
  if (clearAllLogsBtn) {
    clearAllLogsBtn.addEventListener('click', () => {
      // Only show the confirm dialog if there are logs to clear
      if (state.logs.length > 0) {
        const confirmClear = confirm('Are you sure you want to delete ALL logs? This action cannot be undone.');
        
        if (confirmClear) {
          console.log('Clearing all logs');
          
          // Clear all logs from state and localStorage
          const cleared = clearAllLogs();
          
          if (cleared) {
            console.log('All logs cleared successfully');
            
            // Refresh the logs view
            const { setupLogsView } = require('./logs');
            setupLogsView();
          } else {
            console.error('Failed to clear logs');
            alert('Failed to clear logs. Please try again.');
          }
        }
      } else {
        alert('No logs to clear.');
      }
    });
  }
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