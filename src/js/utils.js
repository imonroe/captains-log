/**
 * Utils module - Utility functions for the Captain's Log application
 */

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

// Generate a UUID (for log IDs)
function generateUUID() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

module.exports = {
  formatTime,
  calculateStardate,
  generateUUID
};