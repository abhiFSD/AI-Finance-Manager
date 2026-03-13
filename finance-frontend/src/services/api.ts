import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { APP_CONSTANTS } from '../utils/constants';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: APP_CONSTANTS.API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and user ID
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const tokens = localStorage.getItem(APP_CONSTANTS.TOKEN_STORAGE_KEY);
    const userStr = localStorage.getItem('user');
    
    if (tokens) {
      try {
        const { accessToken } = JSON.parse(tokens);
        if (accessToken && config.headers) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
      } catch (error) {
        console.error('Error parsing stored tokens:', error);
      }
    }
    
    // Add user ID header if available
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user?.id && config.headers) {
          config.headers['x-user-id'] = user.id;
        }
      } catch (error) {
        console.error('Error parsing stored user:', error);
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const tokens = localStorage.getItem(APP_CONSTANTS.TOKEN_STORAGE_KEY);
      
      if (tokens) {
        try {
          const { refreshToken } = JSON.parse(tokens);
          
          if (refreshToken) {
            const response = await axios.post(
              `${APP_CONSTANTS.API_BASE_URL}/auth/refresh`,
              { refreshToken }
            );
            
            const { accessToken, refreshToken: newRefreshToken } = response.data.data;
            
            // Update stored tokens
            localStorage.setItem(
              APP_CONSTANTS.TOKEN_STORAGE_KEY,
              JSON.stringify({ accessToken, refreshToken: newRefreshToken })
            );
            
            // Update the authorization header and retry the original request
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            }
            
            return api(originalRequest);
          }
        } catch (refreshError) {
          // If refresh fails, clear auth and redirect to login
          localStorage.removeItem(APP_CONSTANTS.TOKEN_STORAGE_KEY);
          localStorage.removeItem(APP_CONSTANTS.USER_STORAGE_KEY);
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Helper function to handle API errors
export const handleApiError = (error: any): string => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        return data.message || 'Invalid request. Please check your input.';
      case 401:
        return 'You are not authorized to perform this action.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 422:
        return data.message || 'Validation error. Please check your input.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return data.message || 'An unexpected error occurred.';
    }
  } else if (error.request) {
    // Request was made but no response received
    return 'Network error. Please check your internet connection.';
  } else {
    // Something else happened
    return 'An unexpected error occurred.';
  }
};

// Generic API methods
export const apiClient = {
  get: <T>(url: string, config?: AxiosRequestConfig) => 
    api.get<T>(url, config),
  
  post: <T>(url: string, data?: any, config?: AxiosRequestConfig) => 
    api.post<T>(url, data, config),
  
  put: <T>(url: string, data?: any, config?: AxiosRequestConfig) => 
    api.put<T>(url, data, config),
  
  patch: <T>(url: string, data?: any, config?: AxiosRequestConfig) => 
    api.patch<T>(url, data, config),
  
  delete: <T>(url: string, config?: AxiosRequestConfig) => 
    api.delete<T>(url, config),
};

export default api;