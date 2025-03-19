/**
 * Whisper API Service
 * Handles interaction with the OpenAI Whisper API for speech-to-text transcription
 */

const { OpenAI } = require('openai');
const FormData = require('form-data');
const { loadApiKey, isApiKeyConfigured } = require('./settings');

// Function to get a configured OpenAI client
function getOpenAIClient() {
  // Attempt to load the API key from settings
  const apiKey = loadApiKey();
  
  if (!apiKey) {
    console.error('No OpenAI API key found');
    return null;
  }
  
  // Create and return a new OpenAI client with the loaded API key
  // Since we're running in the browser, we need to set dangerouslyAllowBrowser to true
  return new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });
}

/**
 * Convert an audio blob to a file format that OpenAI's API can process
 * @param {Blob} audioBlob - The audio blob from the recording
 * @param {String} filename - The name to give the audio file
 * @returns {File} A file object that can be sent to the API
 */
function createAudioFile(audioBlob, filename) {
  console.log('Creating audio file for transcription from blob');
  return new File([audioBlob], filename, { type: 'audio/webm' });
}

/**
 * Transcribe an audio file using OpenAI's Whisper API
 * @param {Blob} audioBlob - The audio blob from the recording
 * @returns {Promise<Object>} A promise that resolves to the transcription data
 */
async function transcribeAudio(audioBlob) {
  try {
    console.log('Starting audio transcription with Whisper API');
    
    // Check if API key is configured
    if (!isApiKeyConfigured()) {
      console.error('OpenAI API key not found. Please configure it in the settings.');
      return {
        error: true,
        message: 'API key not configured',
        transcription: 'Transcription unavailable - Please add your OpenAI API key in Settings.'
      };
    }
    
    // Get the OpenAI client
    const openai = getOpenAIClient();
    if (!openai) {
      return {
        error: true,
        message: 'Failed to initialize OpenAI client',
        transcription: 'Transcription unavailable - Could not connect to OpenAI.'
      };
    }
    
    // Create a unique filename for the audio
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `recording-${timestamp}.webm`;
    
    // Create a file object from the blob
    const audioFile = createAudioFile(audioBlob, filename);
    console.log('Audio file created:', audioFile.name, `(${audioFile.size} bytes)`);
    
    // Create form data for the API request
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'json');
    
    console.log('Sending transcription request to OpenAI API');
    
    // Call the OpenAI Whisper API
    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'json'
    });
    
    console.log('Transcription completed successfully:', response);
    
    // Return the transcription data
    return {
      error: false,
      transcription: response.text,
      metadata: {
        processingTime: Date.now(),
        model: 'whisper-1'
      }
    };
  } catch (error) {
    console.error('Error transcribing audio:', error);
    
    // Return error response with a placeholder transcription
    return {
      error: true,
      message: error.message || 'Unknown error during transcription',
      transcription: 'Transcription failed. This is a placeholder text until the actual transcription can be processed.',
      errorDetails: error
    };
  }
}

module.exports = {
  transcribeAudio
};