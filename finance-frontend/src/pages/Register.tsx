import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Link,
  Divider,
  InputAdornment,
  IconButton,
  CircularProgress,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
  PersonAdd,
} from '@mui/icons-material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  validateRequired,
  validateForm,
} from '../utils/validators';
import { handleApiError } from '../services/api';
import { ROUTE_PATHS, APP_CONSTANTS } from '../utils/constants';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string>('');

  const handleInputChange = (field: string) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'acceptTerms' ? event.target.checked : event.target.value;
    setFormData({ ...formData, [field]: value });
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
    if (apiError) {
      setApiError('');
    }
  };

  const handleTogglePassword = (field: 'password' | 'confirmPassword') => () => {
    if (field === 'password') {
      setShowPassword(!showPassword);
    } else {
      setShowConfirmPassword(!showConfirmPassword);
    }
  };

  const validateFormData = () => {
    const validations = [
      { field: 'firstName', validation: validateRequired(formData.firstName, 'First name') },
      { field: 'lastName', validation: validateRequired(formData.lastName, 'Last name') },
      { field: 'email', validation: validateEmail(formData.email) },
      { field: 'password', validation: validatePassword(formData.password) },
      { 
        field: 'confirmPassword', 
        validation: validatePasswordConfirmation(formData.password, formData.confirmPassword) 
      },
      {
        field: 'acceptTerms',
        validation: formData.acceptTerms 
          ? { isValid: true }
          : { isValid: false, error: 'You must accept the terms and conditions' }
      },
    ];

    const { isValid, errors: validationErrors } = validateForm(validations);
    setErrors(validationErrors);
    return isValid;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setApiError('');

    if (!validateFormData()) {
      return;
    }

    setLoading(true);

    try {
      await register({
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });

      // Navigate to dashboard after successful registration
      navigate(ROUTE_PATHS.DASHBOARD, { replace: true });
    } catch (error: any) {
      setApiError(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 3,
      }}
    >
      <Paper
        elevation={10}
        sx={{
          padding: 4,
          width: '100%',
          maxWidth: 450,
          borderRadius: 3,
        }}
      >
        <Box textAlign="center" mb={3}>
          <PersonAdd
            sx={{ fontSize: 48, color: 'primary.main', mb: 1 }}
          />
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            Create Account
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Join {APP_CONSTANTS.APP_NAME} and take control of your finances
          </Typography>
        </Box>

        {apiError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {apiError}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="First Name"
              value={formData.firstName}
              onChange={handleInputChange('firstName')}
              error={!!errors.firstName}
              helperText={errors.firstName}
              margin="normal"
              autoComplete="given-name"
              autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Last Name"
              value={formData.lastName}
              onChange={handleInputChange('lastName')}
              error={!!errors.lastName}
              helperText={errors.lastName}
              margin="normal"
              autoComplete="family-name"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={handleInputChange('email')}
            error={!!errors.email}
            helperText={errors.email}
            margin="normal"
            autoComplete="email"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleInputChange('password')}
            error={!!errors.password}
            helperText={errors.password}
            margin="normal"
            autoComplete="new-password"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleTogglePassword('password')}
                    edge="end"
                    aria-label="toggle password visibility"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="Confirm Password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={handleInputChange('confirmPassword')}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword}
            margin="normal"
            autoComplete="new-password"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleTogglePassword('confirmPassword')}
                    edge="end"
                    aria-label="toggle confirm password visibility"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={formData.acceptTerms}
                onChange={handleInputChange('acceptTerms')}
                name="acceptTerms"
                color="primary"
              />
            }
            label={
              <Typography variant="body2">
                I agree to the{' '}
                <Link href="/terms" target="_blank" rel="noopener">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" target="_blank" rel="noopener">
                  Privacy Policy
                </Link>
              </Typography>
            }
            sx={{ mt: 2 }}
          />
          {errors.acceptTerms && (
            <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
              {errors.acceptTerms}
            </Typography>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ mt: 3, mb: 2, py: 1.5 }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Create Account'
            )}
          </Button>

          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="textSecondary">
              OR
            </Typography>
          </Divider>

          <Box textAlign="center">
            <Typography variant="body2" color="textSecondary">
              Already have an account?{' '}
              <Link
                component={RouterLink}
                to={ROUTE_PATHS.LOGIN}
                variant="body2"
                sx={{ 
                  textDecoration: 'none', 
                  fontWeight: 'bold',
                  '&:hover': { textDecoration: 'underline' } 
                }}
              >
                Sign in here
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default Register;