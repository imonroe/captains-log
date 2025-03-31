/**
 * Auth UI module - Handles UI interactions for authentication screens
 */

const { calculateStardate } = require('./utils');
const { register, login, logout, isAuthenticated, getUser, requestPasswordReset, resetPassword, updateProfile } = require('./auth');
const { users } = require('./database');

// DOM elements
let authContainer;
let appContainer;
let loginScreen;
let registerScreen;
let forgotPasswordScreen;
let setNewPasswordScreen;
let profileScreen;
let userMenu;
let userMenuToggle;
let userName;

// Auth screen DOM elements
let loginEmail;
let loginPassword;
let loginButton;
let loginMessage;
let showRegisterLink;
let showForgotPasswordLink;

let registerName;
let registerEmail;
let registerPassword;
let registerPasswordConfirm;
let registerButton;
let registerMessage;
let showLoginLink;

let resetEmail;
let resetButton;
let resetMessage;
let backToLoginLink;

let newPassword;
let newPasswordConfirm;
let setNewPasswordButton;
let newPasswordMessage;

let profileName;
let profileEmail;
let profileMessage;
let saveProfileButton;

let currentPassword;
let profileNewPassword;
let profileNewPasswordConfirm;
let passwordMessage;
let changePasswordButton;

let deleteAccountButton;

let authStardate;

// Initialize auth UI
function initAuthUI() {
  console.log('Initializing auth UI...');
  
  // Get auth container elements
  authContainer = document.getElementById('authContainer');
  appContainer = document.getElementById('appContainer');
  
  // Get auth screens
  loginScreen = document.getElementById('loginScreen');
  registerScreen = document.getElementById('registerScreen');
  forgotPasswordScreen = document.getElementById('forgotPasswordScreen');
  setNewPasswordScreen = document.getElementById('setNewPasswordScreen');
  profileScreen = document.getElementById('profileScreen');
  
  // Get user menu elements
  userMenu = document.getElementById('userMenu');
  userMenuToggle = document.getElementById('userMenuToggle');
  userName = document.getElementById('userName');
  
  // Get login screen elements
  loginEmail = document.getElementById('loginEmail');
  loginPassword = document.getElementById('loginPassword');
  loginButton = document.getElementById('loginButton');
  loginMessage = document.getElementById('loginMessage');
  showRegisterLink = document.getElementById('showRegisterLink');
  showForgotPasswordLink = document.getElementById('showForgotPasswordLink');
  
  // Get register screen elements
  registerName = document.getElementById('registerName');
  registerEmail = document.getElementById('registerEmail');
  registerPassword = document.getElementById('registerPassword');
  registerPasswordConfirm = document.getElementById('registerPasswordConfirm');
  registerButton = document.getElementById('registerButton');
  registerMessage = document.getElementById('registerMessage');
  showLoginLink = document.getElementById('showLoginLink');
  
  // Get forgot password screen elements
  resetEmail = document.getElementById('resetEmail');
  resetButton = document.getElementById('resetButton');
  resetMessage = document.getElementById('resetMessage');
  backToLoginLink = document.getElementById('backToLoginLink');
  
  // Get reset password screen elements
  newPassword = document.getElementById('newPassword');
  newPasswordConfirm = document.getElementById('newPasswordConfirm');
  setNewPasswordButton = document.getElementById('setNewPasswordButton');
  newPasswordMessage = document.getElementById('newPasswordMessage');
  
  // Get profile screen elements
  profileName = document.getElementById('profileName');
  profileEmail = document.getElementById('profileEmail');
  profileMessage = document.getElementById('profileMessage');
  saveProfileButton = document.getElementById('saveProfileButton');
  
  currentPassword = document.getElementById('currentPassword');
  profileNewPassword = document.getElementById('profileNewPassword');
  profileNewPasswordConfirm = document.getElementById('profileNewPasswordConfirm');
  passwordMessage = document.getElementById('passwordMessage');
  changePasswordButton = document.getElementById('changePasswordButton');
  
  deleteAccountButton = document.getElementById('deleteAccountButton');
  
  // Get stardate display
  authStardate = document.getElementById('authStardate');
  
  // Check if user is already authenticated
  checkAuth();
  
  // Update stardate display
  updateAuthStardate();
  
  // Add event listeners
  setupAuthEventListeners();
  
  console.log('Auth UI initialization complete');
}

// Update the stardate display in auth screens
function updateAuthStardate() {
  if (authStardate) {
    authStardate.textContent = calculateStardate();
  }
}

// Show a specific auth screen
function showAuthScreen(screenId) {
  // Hide all screens
  [loginScreen, registerScreen, forgotPasswordScreen, setNewPasswordScreen].forEach(screen => {
    if (screen) screen.classList.remove('active');
  });
  
  // Show the requested screen
  const screen = document.getElementById(screenId);
  if (screen) {
    screen.classList.add('active');
    
    // Clear any previous messages
    const messageElement = screen.querySelector('.auth-message');
    if (messageElement) {
      messageElement.textContent = '';
      messageElement.classList.remove('success');
    }
    
    // Focus the first input field
    const firstInput = screen.querySelector('input');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  }
}

// Set up event listeners for auth UI
function setupAuthEventListeners() {
  // Login form submission
  if (loginButton) {
    loginButton.addEventListener('click', handleLogin);
    loginEmail?.addEventListener('keypress', e => {
      if (e.key === 'Enter') loginPassword?.focus();
    });
    loginPassword?.addEventListener('keypress', e => {
      if (e.key === 'Enter') handleLogin();
    });
  }
  
  // Register form submission
  if (registerButton) {
    registerButton.addEventListener('click', handleRegister);
    registerPasswordConfirm?.addEventListener('keypress', e => {
      if (e.key === 'Enter') handleRegister();
    });
  }
  
  // Password reset request
  if (resetButton) {
    resetButton.addEventListener('click', handleResetRequest);
    resetEmail?.addEventListener('keypress', e => {
      if (e.key === 'Enter') handleResetRequest();
    });
  }
  
  // Set new password
  if (setNewPasswordButton) {
    setNewPasswordButton.addEventListener('click', handleSetNewPassword);
    newPasswordConfirm?.addEventListener('keypress', e => {
      if (e.key === 'Enter') handleSetNewPassword();
    });
  }
  
  // Auth screen navigation
  if (showRegisterLink) {
    showRegisterLink.addEventListener('click', e => {
      e.preventDefault();
      showAuthScreen('registerScreen');
    });
  }
  
  if (showLoginLink) {
    showLoginLink.addEventListener('click', e => {
      e.preventDefault();
      showAuthScreen('loginScreen');
    });
  }
  
  if (showForgotPasswordLink) {
    showForgotPasswordLink.addEventListener('click', e => {
      e.preventDefault();
      showAuthScreen('forgotPasswordScreen');
    });
  }
  
  if (backToLoginLink) {
    backToLoginLink.addEventListener('click', e => {
      e.preventDefault();
      showAuthScreen('loginScreen');
    });
  }
  
  // User menu toggle
  if (userMenuToggle) {
    userMenuToggle.addEventListener('click', () => {
      userMenu.classList.toggle('active');
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (userMenu && userMenu.classList.contains('active') && 
          !userMenuToggle.contains(e.target) && 
          !userMenu.contains(e.target)) {
        userMenu.classList.remove('active');
      }
    });
  }
  
  // Menu items
  document.getElementById('profileMenuItem')?.addEventListener('click', () => {
    showProfileScreen();
    userMenu.classList.remove('active');
  });
  
  document.getElementById('logoutMenuItem')?.addEventListener('click', () => {
    handleLogout();
    userMenu.classList.remove('active');
  });
  
  // Profile screen
  if (saveProfileButton) {
    saveProfileButton.addEventListener('click', handleSaveProfile);
  }
  
  if (changePasswordButton) {
    changePasswordButton.addEventListener('click', handleChangePassword);
  }
  
  if (deleteAccountButton) {
    deleteAccountButton.addEventListener('click', handleDeleteAccount);
  }
}

// Handle login form submission
async function handleLogin() {
  if (!loginEmail || !loginPassword || !loginMessage) return;
  
  loginMessage.textContent = '';
  loginMessage.classList.remove('success');
  
  const email = loginEmail.value.trim();
  const password = loginPassword.value;
  
  if (!email || !password) {
    loginMessage.textContent = 'Please enter both email and password';
    return;
  }
  
  loginButton.disabled = true;
  loginButton.textContent = 'LOGGING IN...';
  
  try {
    const result = await login(email, password);
    
    if (result.success) {
      loginMessage.textContent = 'Login successful!';
      loginMessage.classList.add('success');
      
      // Switch to app container
      setTimeout(() => showApp(result.user), 500);
    } else {
      loginMessage.textContent = result.error || 'Login failed. Please check your credentials.';
    }
  } catch (error) {
    console.error('Login error:', error);
    loginMessage.textContent = 'An unexpected error occurred. Please try again.';
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = 'LOGIN';
  }
}

// Handle register form submission
async function handleRegister() {
  if (!registerName || !registerEmail || !registerPassword || !registerPasswordConfirm || !registerMessage) return;
  
  registerMessage.textContent = '';
  registerMessage.classList.remove('success');
  
  const name = registerName.value.trim();
  const email = registerEmail.value.trim();
  const password = registerPassword.value;
  const confirmPassword = registerPasswordConfirm.value;
  
  if (!email || !password) {
    registerMessage.textContent = 'Please fill out all required fields';
    return;
  }
  
  if (password !== confirmPassword) {
    registerMessage.textContent = 'Passwords do not match';
    return;
  }
  
  registerButton.disabled = true;
  registerButton.textContent = 'CREATING ACCOUNT...';
  
  try {
    const result = await register(email, password, name);
    
    if (result.success) {
      registerMessage.textContent = 'Account created successfully!';
      registerMessage.classList.add('success');
      
      // Switch to app container
      setTimeout(() => showApp(result.user), 500);
    } else {
      registerMessage.textContent = result.error || 'Failed to create account. Please try again.';
    }
  } catch (error) {
    console.error('Registration error:', error);
    registerMessage.textContent = 'An unexpected error occurred. Please try again.';
  } finally {
    registerButton.disabled = false;
    registerButton.textContent = 'CREATE ACCOUNT';
  }
}

// Handle password reset request
async function handleResetRequest() {
  if (!resetEmail || !resetMessage || !resetButton) return;
  
  resetMessage.textContent = '';
  resetMessage.classList.remove('success');
  
  const email = resetEmail.value.trim();
  
  if (!email) {
    resetMessage.textContent = 'Please enter your email address';
    return;
  }
  
  resetButton.disabled = true;
  resetButton.textContent = 'SENDING...';
  
  try {
    const result = await requestPasswordReset(email);
    
    if (result.success) {
      resetMessage.textContent = 'If an account exists with this email, you will receive password reset instructions.';
      resetMessage.classList.add('success');
      
      // In a real application, this would send an email with a link
      console.log(`A password reset token would be sent to ${email} in a real app`);
      
      // For demo purposes, show the token in the console
      // Simulate showing the reset screen that would normally be accessed via email link
      const token = getTokenFromConsole(); // This is just for demo, normally would be from URL
      
      setTimeout(() => {
        showAuthScreen('setNewPasswordScreen');
        // Store token in a data attribute for the set password screen
        setNewPasswordButton.dataset.resetToken = token;
      }, 2000);
    } else {
      resetMessage.textContent = result.error || 'Failed to request password reset. Please try again.';
    }
  } catch (error) {
    console.error('Password reset request error:', error);
    resetMessage.textContent = 'An unexpected error occurred. Please try again.';
  } finally {
    resetButton.disabled = false;
    resetButton.textContent = 'SEND RESET LINK';
  }
}

// For demo purposes only - would be replaced with email link in real app
function getTokenFromConsole() {
  // This would come from URL query params in a real app (from email link)
  return 'demo-reset-token';
}

// Handle setting a new password
async function handleSetNewPassword() {
  if (!newPassword || !newPasswordConfirm || !newPasswordMessage || !setNewPasswordButton) return;
  
  newPasswordMessage.textContent = '';
  newPasswordMessage.classList.remove('success');
  
  const password = newPassword.value;
  const confirmPassword = newPasswordConfirm.value;
  const token = setNewPasswordButton.dataset.resetToken;
  
  if (!password || !confirmPassword) {
    newPasswordMessage.textContent = 'Please enter both password fields';
    return;
  }
  
  if (password !== confirmPassword) {
    newPasswordMessage.textContent = 'Passwords do not match';
    return;
  }
  
  if (!token) {
    newPasswordMessage.textContent = 'Reset token is missing';
    return;
  }
  
  setNewPasswordButton.disabled = true;
  setNewPasswordButton.textContent = 'UPDATING...';
  
  try {
    const result = await resetPassword(token, password);
    
    if (result.success) {
      newPasswordMessage.textContent = 'Password updated successfully! You can now log in with your new password.';
      newPasswordMessage.classList.add('success');
      
      // Redirect to login screen after a short delay
      setTimeout(() => showAuthScreen('loginScreen'), 2000);
    } else {
      newPasswordMessage.textContent = result.error || 'Failed to reset password. Please try again.';
    }
  } catch (error) {
    console.error('Password reset error:', error);
    newPasswordMessage.textContent = 'An unexpected error occurred. Please try again.';
  } finally {
    setNewPasswordButton.disabled = false;
    setNewPasswordButton.textContent = 'SET NEW PASSWORD';
  }
}

// Handle saving profile changes
async function handleSaveProfile() {
  if (!profileName || !profileEmail || !profileMessage || !saveProfileButton) return;
  
  profileMessage.textContent = '';
  profileMessage.classList.remove('success');
  
  const name = profileName.value.trim();
  const email = profileEmail.value.trim();
  
  if (!email) {
    profileMessage.textContent = 'Email is required';
    return;
  }
  
  saveProfileButton.disabled = true;
  saveProfileButton.textContent = 'SAVING...';
  
  try {
    const user = getUser();
    if (!user) {
      profileMessage.textContent = 'User session expired. Please log in again.';
      setTimeout(() => showAuthScreen('loginScreen'), 2000);
      return;
    }
    
    const result = await updateProfile(user.id, { name, email });
    
    if (result.success) {
      profileMessage.textContent = 'Profile updated successfully!';
      profileMessage.classList.add('success');
      
      // Update user name in header
      if (userName) {
        userName.textContent = name || email.split('@')[0];
      }
    } else {
      profileMessage.textContent = result.error || 'Failed to update profile. Please try again.';
    }
  } catch (error) {
    console.error('Profile update error:', error);
    profileMessage.textContent = 'An unexpected error occurred. Please try again.';
  } finally {
    saveProfileButton.disabled = false;
    saveProfileButton.textContent = 'SAVE CHANGES';
  }
}

// Handle changing password
async function handleChangePassword() {
  if (!currentPassword || !profileNewPassword || !profileNewPasswordConfirm || !passwordMessage || !changePasswordButton) return;
  
  passwordMessage.textContent = '';
  passwordMessage.classList.remove('success');
  
  const current = currentPassword.value;
  const newPass = profileNewPassword.value;
  const confirmPass = profileNewPasswordConfirm.value;
  
  if (!current || !newPass || !confirmPass) {
    passwordMessage.textContent = 'Please fill out all password fields';
    return;
  }
  
  if (newPass !== confirmPass) {
    passwordMessage.textContent = 'New passwords do not match';
    return;
  }
  
  changePasswordButton.disabled = true;
  changePasswordButton.textContent = 'UPDATING...';
  
  try {
    const user = getUser();
    if (!user) {
      passwordMessage.textContent = 'User session expired. Please log in again.';
      setTimeout(() => showAuthScreen('loginScreen'), 2000);
      return;
    }
    
    // First verify current password
    const verifyResult = await users.authenticate(user.email, current);
    
    if (!verifyResult.success) {
      passwordMessage.textContent = 'Current password is incorrect';
      changePasswordButton.disabled = false;
      changePasswordButton.textContent = 'CHANGE PASSWORD';
      return;
    }
    
    // Update password
    const result = await updateProfile(user.id, { password: newPass });
    
    if (result.success) {
      passwordMessage.textContent = 'Password changed successfully!';
      passwordMessage.classList.add('success');
      
      // Clear password fields
      currentPassword.value = '';
      profileNewPassword.value = '';
      profileNewPasswordConfirm.value = '';
    } else {
      passwordMessage.textContent = result.error || 'Failed to change password. Please try again.';
    }
  } catch (error) {
    console.error('Password change error:', error);
    passwordMessage.textContent = 'An unexpected error occurred. Please try again.';
  } finally {
    changePasswordButton.disabled = false;
    changePasswordButton.textContent = 'CHANGE PASSWORD';
  }
}

// Handle account deletion
async function handleDeleteAccount() {
  const confirmDelete = confirm(
    'Are you sure you want to delete your account? This will permanently delete all your logs and cannot be undone.'
  );
  
  if (!confirmDelete) return;
  
  // Double confirm with a second dialog
  const confirmAgain = confirm(
    'FINAL WARNING: This action is PERMANENT and will delete ALL your data. Are you absolutely sure?'
  );
  
  if (!confirmAgain) return;
  
  try {
    const user = getUser();
    if (!user) {
      alert('User session expired. Please log in again.');
      showAuthScreen('loginScreen');
      return;
    }
    
    const result = await users.delete(user.id);
    
    if (result.success) {
      alert('Your account has been deleted successfully.');
      
      // Log out and return to login screen
      logout();
      showLogin();
    } else {
      alert('Failed to delete account: ' + (result.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Account deletion error:', error);
    alert('An unexpected error occurred. Please try again.');
  }
}

// Handle logout
function handleLogout() {
  const logoutResult = logout();
  
  if (logoutResult.success) {
    // Switch back to auth container
    showLogin();
  }
}

// Check if user is authenticated on page load
function checkAuth() {
  if (isAuthenticated()) {
    const user = getUser();
    if (user) {
      showApp(user);
      return true;
    }
  }
  
  showLogin();
  return false;
}

// Show login screen
function showLogin() {
  if (authContainer && appContainer) {
    authContainer.style.display = 'flex';
    appContainer.style.display = 'none';
    
    // Show login screen
    showAuthScreen('loginScreen');
    
    // Clear password fields
    if (loginPassword) loginPassword.value = '';
    if (registerPassword) registerPassword.value = '';
    if (registerPasswordConfirm) registerPasswordConfirm.value = '';
  }
}

// Show app after successful authentication
function showApp(user) {
  if (authContainer && appContainer) {
    authContainer.style.display = 'none';
    appContainer.style.display = 'block';
    
    // Update user name in header
    if (userName) {
      userName.textContent = user.name || user.email.split('@')[0];
    }
    
    // Update profile screen if it exists
    if (profileScreen && profileName && profileEmail) {
      profileName.value = user.name || '';
      profileEmail.value = user.email || '';
    }
  }
}

// Show profile screen
function showProfileScreen() {
  const { ui } = require('./store').state;
  
  // Hide all app screens
  if (ui && ui.screens) {
    ui.screens.forEach(screen => screen.classList.remove('active'));
  }
  
  // Show profile screen
  if (profileScreen) {
    profileScreen.classList.add('active');
  }
  
  // Update navigation buttons
  if (ui) {
    [ui.recordButton, ui.logsButton, ui.settingsButton].forEach(btn => {
      if (btn) btn.classList.remove('active');
    });
  }
  
  // Populate profile data with current user
  const user = getUser();
  if (user && profileName && profileEmail) {
    profileName.value = user.name || '';
    profileEmail.value = user.email || '';
  }
}

module.exports = {
  initAuthUI,
  checkAuth,
  showLogin,
  showApp
};