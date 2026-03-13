import { AxiosResponse } from 'axios';
import { apiClient } from './api';
import { 
  ApiResponse, 
  LoginCredentials, 
  RegisterData, 
  User, 
  AuthTokens,
  UserPreferences 
} from '../types';

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface RegisterResponse {
  user: User;
  tokens: AuthTokens;
}

export interface RefreshTokenResponse {
  tokens: AuthTokens;
}

class AuthService {
  /**
   * Login user with email and password
   */
  async login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
    const response: AxiosResponse<ApiResponse<LoginResponse>> = await apiClient.post(
      '/auth/login',
      credentials
    );
    return response.data;
  }

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<ApiResponse<RegisterResponse>> {
    const response: AxiosResponse<ApiResponse<RegisterResponse>> = await apiClient.post(
      '/auth/register',
      data
    );
    return response.data;
  }

  /**
   * Logout user
   */
  async logout(): Promise<ApiResponse<null>> {
    const response: AxiosResponse<ApiResponse<null>> = await apiClient.post('/auth/logout');
    return response.data;
  }

  /**
   * Refresh authentication tokens
   */
  async refreshToken(refreshToken: string): Promise<ApiResponse<RefreshTokenResponse>> {
    const response: AxiosResponse<ApiResponse<RefreshTokenResponse>> = await apiClient.post(
      '/auth/refresh',
      { refreshToken }
    );
    return response.data;
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<ApiResponse<User>> {
    const response: AxiosResponse<ApiResponse<User>> = await apiClient.get('/auth/profile');
    return response.data;
  }

  /**
   * Update user profile
   */
  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    const response: AxiosResponse<ApiResponse<User>> = await apiClient.patch(
      '/auth/profile',
      data
    );
    return response.data;
  }

  /**
   * Update user preferences
   */
  async updatePreferences(preferences: Partial<UserPreferences>): Promise<ApiResponse<User>> {
    const response: AxiosResponse<ApiResponse<User>> = await apiClient.patch(
      '/auth/preferences',
      preferences
    );
    return response.data;
  }

  /**
   * Change password
   */
  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<ApiResponse<null>> {
    const response: AxiosResponse<ApiResponse<null>> = await apiClient.post(
      '/auth/change-password',
      data
    );
    return response.data;
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<ApiResponse<null>> {
    const response: AxiosResponse<ApiResponse<null>> = await apiClient.post(
      '/auth/forgot-password',
      { email }
    );
    return response.data;
  }

  /**
   * Reset password with token
   */
  async resetPassword(data: {
    token: string;
    password: string;
    confirmPassword: string;
  }): Promise<ApiResponse<null>> {
    const response: AxiosResponse<ApiResponse<null>> = await apiClient.post(
      '/auth/reset-password',
      data
    );
    return response.data;
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string): Promise<ApiResponse<null>> {
    const response: AxiosResponse<ApiResponse<null>> = await apiClient.post(
      '/auth/verify-email',
      { token }
    );
    return response.data;
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification(): Promise<ApiResponse<null>> {
    const response: AxiosResponse<ApiResponse<null>> = await apiClient.post(
      '/auth/resend-verification'
    );
    return response.data;
  }
}

export const authService = new AuthService();