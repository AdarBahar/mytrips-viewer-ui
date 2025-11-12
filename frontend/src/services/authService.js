import axios from 'axios';

// MyTrips API for authentication (direct endpoint, no /api prefix)
const MYTRIPS_API_BASEURL = process.env.REACT_APP_MYTRIPS_API_BASEURL;
const API = MYTRIPS_API_BASEURL;

/**
 * App Login - Stateless authentication
 * Returns authentication status and user_id without creating a session
 * 
 * @param {Object} credentials - Login credentials
 * @param {string} credentials.email - User email
 * @param {string} credentials.password - User password
 * @returns {Promise<Object>} Authentication result
 */
export const appLogin = async ({ email, password }) => {
  try {
    const response = await axios.post(`${API}/auth/app-login`, {
      email,
      password
    });

    return response.data;
  } catch (error) {
    console.error('App login error:', error);
    
    // Return a consistent error response
    return {
      authenticated: false,
      message: error.response?.data?.message || 'Authentication failed'
    };
  }
};

/**
 * Traditional JWT Login - Returns access token
 * Use this for the existing JWT-based authentication flow
 * 
 * @param {Object} credentials - Login credentials
 * @param {string} credentials.username - Username
 * @param {string} credentials.password - User password
 * @returns {Promise<Object>} Token and user data
 */
export const jwtLogin = async ({ username, password }) => {
  try {
    const response = await axios.post(`${API}/auth/login`, {
      username,
      password
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('JWT login error:', error);
    
    return {
      success: false,
      error: error.response?.data?.detail || 'Authentication failed'
    };
  }
};

/**
 * Register new user
 * 
 * @param {Object} userData - User registration data
 * @param {string} userData.username - Username
 * @param {string} userData.email - User email
 * @param {string} userData.password - User password
 * @returns {Promise<Object>} Token and user data
 */
export const register = async ({ username, email, password }) => {
  try {
    const response = await axios.post(`${API}/auth/register`, {
      username,
      email,
      password
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Registration error:', error);
    
    return {
      success: false,
      error: error.response?.data?.detail || 'Registration failed'
    };
  }
};

/**
 * Get current user info (requires JWT token)
 * 
 * @param {string} token - JWT access token
 * @returns {Promise<Object>} User data
 */
export const getCurrentUser = async (token) => {
  try {
    const response = await axios.get(`${API}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Get current user error:', error);
    
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to get user info'
    };
  }
};

