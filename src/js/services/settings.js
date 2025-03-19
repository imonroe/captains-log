/**
 * Settings service - Manages application settings
 */

// Keys for localStorage
const SETTINGS_KEY = 'captainsLogSettings';
const API_KEY_KEY = 'openai_api_key';

// Default settings
const defaultSettings = {
  audioQuality: 'medium',
  silenceThreshold: 30
};

/**
 * Save settings to localStorage
 * @param {Object} settings - Settings object to save
 */
function saveSettings(settings) {
  console.log('Saving settings to localStorage');
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Failed to save settings:', error);
    return false;
  }
}

/**
 * Load settings from localStorage
 * @returns {Object} The loaded settings, or default settings if none are found
 */
function loadSettings() {
  console.log('Loading settings from localStorage');
  try {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      return JSON.parse(savedSettings);
    }
    return { ...defaultSettings };
  } catch (error) {
    console.error('Failed to load settings:', error);
    return { ...defaultSettings };
  }
}

/**
 * Save the OpenAI API key securely
 * @param {string} apiKey - The API key to save
 * @returns {boolean} Whether the save was successful
 */
function saveApiKey(apiKey) {
  console.log('Saving OpenAI API key');
  try {
    // In a production app, you would never store API keys in localStorage
    // This is just for demonstration/development purposes
    // In production, this would be stored securely on a server
    localStorage.setItem(API_KEY_KEY, apiKey);
    
    // Store the API key in memory for this session
    // Note: We can't modify process.env directly in the browser
    
    return true;
  } catch (error) {
    console.error('Failed to save API key:', error);
    return false;
  }
}

/**
 * Load the OpenAI API key
 * @returns {string|null} The API key if it exists, null otherwise
 */
function loadApiKey() {
  console.log('Loading OpenAI API key');
  try {
    const apiKey = localStorage.getItem(API_KEY_KEY);
    
    // We don't modify process.env directly in the browser
    // Just return the API key from localStorage
    
    return apiKey || null;
  } catch (error) {
    console.error('Failed to load API key:', error);
    return null;
  }
}

/**
 * Check if the API key is configured
 * @returns {boolean} Whether the API key is configured
 */
function isApiKeyConfigured() {
  const apiKey = loadApiKey();
  return !!apiKey;
}

module.exports = {
  saveSettings,
  loadSettings,
  saveApiKey,
  loadApiKey,
  isApiKeyConfigured,
  defaultSettings
};