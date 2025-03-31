/**
 * Auth module - Handles user authentication and session management
 */

const { users, getCurrentUser } = require('./database');

// Session duration in milliseconds (7 days)
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;
const AUTH_TOKEN_KEY = 'captainsLogAuthToken';

// Get session token from localStorage
function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

// Store session token in localStorage
function setAuthToken(token, expiresAt) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(`${AUTH_TOKEN_KEY}_expires`, expiresAt);
}

// Clear session token from localStorage
function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(`${AUTH_TOKEN_KEY}_expires`);
}

// Check if user is authenticated
function isAuthenticated() {
  const token = getAuthToken();
  if (!token) {
    return false;
  }
  
  // Check if token is expired
  const expiresAt = localStorage.getItem(`${AUTH_TOKEN_KEY}_expires`);
  if (expiresAt && Number(expiresAt) < Date.now()) {
    clearAuthToken();
    return false;
  }
  
  return true;
}

// Register a new user
async function register(email, password, name) {
  try {
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: 'Invalid email format' };
    }
    
    // Basic password strength validation
    if (password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long' };
    }
    
    // Create new user
    const result = await users.create(email, password, name);
    
    if (result.success) {
      // Auto login after registration
      return await login(email, password);
    }
    
    return result;
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: 'Registration failed' };
  }
}

// Log in a user
async function login(email, password) {
  try {
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }
    
    const result = await users.authenticate(email, password);
    
    if (result.success) {
      // Create session token
      const expiresAt = Date.now() + SESSION_DURATION;
      const tokenData = {
        userId: result.user.id,
        expiresAt
      };
      
      // In a real app, this would be a JWT token
      const token = btoa(JSON.stringify(tokenData));
      
      // Store token
      setAuthToken(token, expiresAt);
      
      return { 
        success: true, 
        user: result.user,
        token
      };
    }
    
    return result;
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

// Log out the current user
function logout() {
  clearAuthToken();
  users.logout();
  return { success: true };
}

// Get the current authenticated user
function getUser() {
  if (!isAuthenticated()) {
    return null;
  }
  
  return getCurrentUser();
}

// Request a password reset token
async function requestPasswordReset(email) {
  try {
    if (!email) {
      return { success: false, error: 'Email is required' };
    }
    
    return await users.generateResetToken(email);
  } catch (error) {
    console.error('Password reset request error:', error);
    return { success: false, error: 'Failed to process reset request' };
  }
}

// Reset a password using token
async function resetPassword(token, newPassword) {
  try {
    if (!token || !newPassword) {
      return { success: false, error: 'Token and new password are required' };
    }
    
    if (newPassword.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long' };
    }
    
    return await users.resetPassword(token, newPassword);
  } catch (error) {
    console.error('Password reset error:', error);
    return { success: false, error: 'Failed to reset password' };
  }
}

// Update user profile
async function updateProfile(userId, updates) {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }
    
    // If updating email, validate format
    if (updates.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.email)) {
        return { success: false, error: 'Invalid email format' };
      }
    }
    
    // If updating password, validate strength
    if (updates.password) {
      if (updates.password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters long' };
      }
    }
    
    return await users.updateProfile(userId, updates);
  } catch (error) {
    console.error('Profile update error:', error);
    return { success: false, error: 'Failed to update profile' };
  }
}

// Check and restore session on page load
function checkSession() {
  if (isAuthenticated()) {
    // Extract user ID from token
    try {
      const token = getAuthToken();
      const tokenData = JSON.parse(atob(token));
      
      // Find user by ID and set as current user
      const user = users.findById(tokenData.userId);
      if (user) {
        dbState.currentUser = user.id;
        return true;
      }
    } catch (error) {
      console.error('Session restoration error:', error);
    }
    
    // Clear invalid token
    clearAuthToken();
  }
  
  return false;
}

module.exports = {
  register,
  login,
  logout,
  getUser,
  requestPasswordReset,
  resetPassword,
  updateProfile,
  isAuthenticated,
  checkSession
};