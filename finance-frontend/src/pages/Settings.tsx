import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Avatar,
  IconButton,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
} from '@mui/material';
// import { Grid } from '@mui/material';
import {
  Save,
  Edit,
  Lock,
  Notifications,
  Palette,
  Language,
  AttachMoney,
  Visibility,
  VisibilityOff,
  PhotoCamera,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';
import { riskProfileService, RiskProfile, RiskProfileFormData } from '../services/risk-profile.service';
import { validatePassword, validateRequired, validateEmail } from '../utils/validators';
import { handleApiError } from '../services/api';
import { APP_CONSTANTS } from '../utils/constants';

const Settings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  
  // Profile form state
  // Handle both name (single field) and firstName/lastName (separate fields)
  const getUserFirstName = () => {
    if (user?.firstName) return user.firstName;
    if (user?.name) return user.name.split(' ')[0] || '';
    return '';
  };
  
  const getUserLastName = () => {
    if (user?.lastName) return user.lastName;
    if (user?.name) {
      const nameParts = user.name.split(' ');
      return nameParts.slice(1).join(' ') || '';
    }
    return '';
  };
  
  const [profileForm, setProfileForm] = useState({
    firstName: getUserFirstName(),
    lastName: getUserLastName(),
    email: user?.email || '',
  });
  
  // Preferences form state
  const [preferencesForm, setPreferencesForm] = useState({
    currency: user?.preferences?.currency || 'INR',
    dateFormat: user?.preferences?.dateFormat || 'DD/MM/YYYY',
    theme: user?.preferences?.theme || 'light',
    notifications: {
      email: user?.preferences?.notifications?.email ?? true,
      push: user?.preferences?.notifications?.push ?? false,
    },
  });
  
  // Password change form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Risk Profile state
  const [riskProfile, setRiskProfile] = useState<RiskProfile | null>(null);
  const [riskProfileForm, setRiskProfileForm] = useState<RiskProfileFormData>({
    age: '26-35',
    incomeStability: 'stable',
    investmentHorizon: '3-5',
    riskTolerance: 'hold',
    investmentExperience: 'beginner',
  });
  
  // Update form when user data changes
  React.useEffect(() => {
    if (user) {
      // Parse firstName and lastName from user object
      const firstName = user.firstName || (user.name ? user.name.split(' ')[0] : '') || '';
      const lastName = user.lastName || (user.name ? user.name.split(' ').slice(1).join(' ') : '') || '';
      
      setProfileForm({
        firstName,
        lastName,
        email: user.email || '',
      });
      
      setPreferencesForm({
        currency: user.preferences?.currency || 'INR',
        dateFormat: user.preferences?.dateFormat || 'DD/MM/YYYY',
        theme: user.preferences?.theme || 'light',
        notifications: {
          email: user.preferences?.notifications?.email ?? true,
          push: user.preferences?.notifications?.push ?? false,
        },
      });
    }
  }, [user]);

  // Load risk profile
  React.useEffect(() => {
    const loadRiskProfile = async () => {
      try {
        const response = await riskProfileService.getRiskProfile();
        setRiskProfile(response.data as RiskProfile);
      } catch (error) {
        console.log('No risk profile found');
      }
    };
    loadRiskProfile();
  }, []);

  const handleRiskProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    try {
      setLoading(true);
      const response = await riskProfileService.saveRiskProfile(riskProfileForm);
      setRiskProfile(response.data as RiskProfile);
      setMessage({ type: 'success', text: 'Risk profile saved successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: handleApiError(error) });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Validate form
    const newErrors: Record<string, string> = {};
    
    const firstNameValidation = validateRequired(profileForm.firstName, 'First name');
    if (!firstNameValidation.isValid) {
      newErrors.firstName = firstNameValidation.error!;
    }
    
    const lastNameValidation = validateRequired(profileForm.lastName, 'Last name');
    if (!lastNameValidation.isValid) {
      newErrors.lastName = lastNameValidation.error!;
    }
    
    const emailValidation = validateEmail(profileForm.email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error!;
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    try {
      setLoading(true);
      setErrors({});
      
      const response = await authService.updateProfile(profileForm);
      updateUser(response.data);
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: handleApiError(error) });
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    try {
      setLoading(true);
      
      const response = await authService.updatePreferences(preferencesForm);
      updateUser(response.data);
      
      setMessage({ type: 'success', text: 'Preferences updated successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: handleApiError(error) });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Validate passwords
    const newErrors: Record<string, string> = {};
    
    const currentPasswordValidation = validateRequired(passwordForm.currentPassword, 'Current password');
    if (!currentPasswordValidation.isValid) {
      newErrors.currentPassword = currentPasswordValidation.error!;
    }
    
    const newPasswordValidation = validatePassword(passwordForm.newPassword);
    if (!newPasswordValidation.isValid) {
      newErrors.newPassword = newPasswordValidation.error!;
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    try {
      setLoading(true);
      setErrors({});
      
      await authService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });
      
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
      setChangePasswordOpen(false);
      setMessage({ type: 'success', text: 'Password changed successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: handleApiError(error) });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Handle avatar upload here
      // This would typically involve uploading to your API
      console.log('Avatar file selected:', file);
    }
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleInputChange = (
    form: 'profile' | 'preferences' | 'password',
    field: string,
    value: any
  ) => {
    if (form === 'profile') {
      setProfileForm(prev => ({ ...prev, [field]: value }));
    } else if (form === 'preferences') {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        setPreferencesForm(prev => ({
          ...prev,
          [parent]: {
            ...(prev[parent as keyof typeof prev] as Record<string, any> || {}),
            [child]: value,
          },
        }));
      } else {
        setPreferencesForm(prev => ({ ...prev, [field]: value }));
      }
    } else if (form === 'password') {
      setPasswordForm(prev => ({ ...prev, [field]: value }));
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Settings
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {/* Profile Settings */}
        <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: 'calc(66.666% - 12px)' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Profile Information
              </Typography>
              
              <Box component="form" onSubmit={handleProfileSubmit}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Avatar
                    src={user?.avatar}
                    sx={{ width: 80, height: 80, mr: 2 }}
                  >
                    {user ? ((user as any).name?.charAt(0) || user.email?.charAt(0) || 'U') : 'U'}
                  </Avatar>
                  <Box>
                    <input
                      accept="image/*"
                      style={{ display: 'none' }}
                      id="avatar-upload"
                      type="file"
                      onChange={handleAvatarChange}
                    />
                    <label htmlFor="avatar-upload">
                      <IconButton component="span" color="primary">
                        <PhotoCamera />
                      </IconButton>
                    </label>
                    <Typography variant="body2" color="textSecondary">
                      Upload a new profile picture
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                    <TextField
                      fullWidth
                      label="First Name"
                      value={profileForm.firstName}
                      onChange={(e) => handleInputChange('profile', 'firstName', e.target.value)}
                      error={!!errors.firstName}
                      helperText={errors.firstName}
                    />
                  </Box>
                  <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      value={profileForm.lastName}
                      onChange={(e) => handleInputChange('profile', 'lastName', e.target.value)}
                      error={!!errors.lastName}
                      helperText={errors.lastName}
                    />
                  </Box>
                  <Box sx={{ flexGrow: 1, flexBasis: '100%' }}>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => handleInputChange('profile', 'email', e.target.value)}
                      error={!!errors.email}
                      helperText={errors.email}
                    />
                  </Box>
                </Box>
                
                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<Save />}
                    disabled={loading}
                  >
                    Save Profile
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Lock />}
                    onClick={() => setChangePasswordOpen(true)}
                  >
                    Change Password
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Preferences */}
        <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: 'calc(33.333% - 16px)' } }}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <AttachMoney sx={{ mr: 1, verticalAlign: 'bottom' }} />
                Currency & Format
              </Typography>
              
              <Box component="form" onSubmit={handlePreferencesSubmit}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Currency</InputLabel>
                  <Select
                    value={preferencesForm.currency}
                    onChange={(e) => handleInputChange('preferences', 'currency', e.target.value)}
                    label="Currency"
                  >
                    {APP_CONSTANTS.SUPPORTED_CURRENCIES.map((currency) => (
                      <MenuItem key={currency} value={currency}>
                        {currency}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Date Format</InputLabel>
                  <Select
                    value={preferencesForm.dateFormat}
                    onChange={(e) => handleInputChange('preferences', 'dateFormat', e.target.value)}
                    label="Date Format"
                  >
                    <MenuItem value="DD/MM/YYYY">DD/MM/YYYY (Indian)</MenuItem>
                    <MenuItem value="MM/DD/YYYY">MM/DD/YYYY (US)</MenuItem>
                    <MenuItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</MenuItem>
                  </Select>
                </FormControl>
                
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                >
                  Save Preferences
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Palette sx={{ mr: 1, verticalAlign: 'bottom' }} />
                Appearance
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Theme</InputLabel>
                <Select
                  value={preferencesForm.theme}
                  onChange={(e) => handleInputChange('preferences', 'theme', e.target.value)}
                  label="Theme"
                >
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="dark">Dark</MenuItem>
                </Select>
              </FormControl>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Notifications sx={{ mr: 1, verticalAlign: 'bottom' }} />
                Notifications
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={preferencesForm.notifications.email}
                    onChange={(e) => handleInputChange('preferences', 'notifications.email', e.target.checked)}
                  />
                }
                label="Email Notifications"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={preferencesForm.notifications.push}
                    onChange={(e) => handleInputChange('preferences', 'notifications.push', e.target.checked)}
                  />
                }
                label="Push Notifications"
              />
            </CardContent>
          </Card>

          {/* Risk Profile Section */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Risk Assessment Profile
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                Answer these questions to help us understand your investment risk tolerance and provide personalized recommendations.
              </Typography>

              {riskProfile && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2" fontWeight="bold">
                    Current Profile: {riskProfile.category}
                  </Typography>
                  <Typography variant="caption">
                    Risk Score: {riskProfile.score}/100
                  </Typography>
                </Alert>
              )}

              <Box component="form" onSubmit={handleRiskProfileSubmit}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>1. Age Range</InputLabel>
                  <Select
                    value={riskProfileForm.age}
                    onChange={(e) => setRiskProfileForm({ ...riskProfileForm, age: e.target.value as any })}
                    label="1. Age Range"
                  >
                    <MenuItem value="18-25">18-25</MenuItem>
                    <MenuItem value="26-35">26-35</MenuItem>
                    <MenuItem value="36-45">36-45</MenuItem>
                    <MenuItem value="46-55">46-55</MenuItem>
                    <MenuItem value="55+">55+</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>2. Income Stability</InputLabel>
                  <Select
                    value={riskProfileForm.incomeStability}
                    onChange={(e) => setRiskProfileForm({ ...riskProfileForm, incomeStability: e.target.value as any })}
                    label="2. Income Stability"
                  >
                    <MenuItem value="very_stable">Very Stable</MenuItem>
                    <MenuItem value="stable">Stable</MenuItem>
                    <MenuItem value="moderate">Moderate</MenuItem>
                    <MenuItem value="unstable">Unstable</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>3. Investment Horizon</InputLabel>
                  <Select
                    value={riskProfileForm.investmentHorizon}
                    onChange={(e) => setRiskProfileForm({ ...riskProfileForm, investmentHorizon: e.target.value as any })}
                    label="3. Investment Horizon"
                  >
                    <MenuItem value="<1">Less than 1 year</MenuItem>
                    <MenuItem value="1-3">1-3 years</MenuItem>
                    <MenuItem value="3-5">3-5 years</MenuItem>
                    <MenuItem value="5-10">5-10 years</MenuItem>
                    <MenuItem value="10+">10+ years</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>4. If investments drop 20%, what do you do?</InputLabel>
                  <Select
                    value={riskProfileForm.riskTolerance}
                    onChange={(e) => setRiskProfileForm({ ...riskProfileForm, riskTolerance: e.target.value as any })}
                    label="4. If investments drop 20%, what do you do?"
                  >
                    <MenuItem value="sell_immediately">Sell immediately</MenuItem>
                    <MenuItem value="sell_some">Sell some</MenuItem>
                    <MenuItem value="hold">Hold</MenuItem>
                    <MenuItem value="buy_more">Buy more</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>5. Investment Experience</InputLabel>
                  <Select
                    value={riskProfileForm.investmentExperience}
                    onChange={(e) => setRiskProfileForm({ ...riskProfileForm, investmentExperience: e.target.value as any })}
                    label="5. Investment Experience"
                  >
                    <MenuItem value="none">None</MenuItem>
                    <MenuItem value="beginner">Beginner</MenuItem>
                    <MenuItem value="intermediate">Intermediate</MenuItem>
                    <MenuItem value="expert">Expert</MenuItem>
                  </Select>
                </FormControl>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                >
                  {riskProfile ? 'Update Risk Profile' : 'Save Risk Profile'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Change Password Dialog */}
      <Dialog
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handlePasswordSubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Current Password"
              type={showPasswords.current ? 'text' : 'password'}
              value={passwordForm.currentPassword}
              onChange={(e) => handleInputChange('password', 'currentPassword', e.target.value)}
              error={!!errors.currentPassword}
              helperText={errors.currentPassword}
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => togglePasswordVisibility('current')}
                      edge="end"
                    >
                      {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            <TextField
              fullWidth
              label="New Password"
              type={showPasswords.new ? 'text' : 'password'}
              value={passwordForm.newPassword}
              onChange={(e) => handleInputChange('password', 'newPassword', e.target.value)}
              error={!!errors.newPassword}
              helperText={errors.newPassword}
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => togglePasswordVisibility('new')}
                      edge="end"
                    >
                      {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            <TextField
              fullWidth
              label="Confirm New Password"
              type={showPasswords.confirm ? 'text' : 'password'}
              value={passwordForm.confirmPassword}
              onChange={(e) => handleInputChange('password', 'confirmPassword', e.target.value)}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => togglePasswordVisibility('confirm')}
                      edge="end"
                    >
                      {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangePasswordOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handlePasswordSubmit}
            variant="contained"
            disabled={loading}
          >
            Change Password
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Messages */}
      <Snackbar
        open={!!message}
        autoHideDuration={6000}
        onClose={() => setMessage(null)}
      >
        {message ? (
          <Alert
            onClose={() => setMessage(null)}
            severity={message.type}
            sx={{ width: '100%' }}
          >
            {message.text}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
};

export default Settings;