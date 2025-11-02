'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, User, Chrome, Facebook, Github, Loader2, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signUpWithEmail, signInWithGoogle, signInWithFacebook, signInWithGithub } from '@/lib/auth-utils';
import { useAuth } from '@/hooks/use-auth';

export default function SignupPage() {
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Redirect if already logged in (but wait for auth to load first)
  // Temporarily disabled - auth removed for now
  // useEffect(() => {
  //   if (!authLoading && currentUser) {
  //     router.push('/');
  //   }
  // }, [authLoading, currentUser, router]);

  const validateForm = (): boolean => {
    if (!displayName || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    if (!agreedToTerms) {
      setError('Please agree to terms and conditions');
      return false;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await signUpWithEmail(email, password, displayName);
      setSuccess(true);
      setLoading(false);
      // Don't call router.push() here - let the useEffect handle it
      // when currentUser is updated by Firebase
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign up';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setLoading(true);

    try {
      await signInWithGoogle();
      // Don't call router.push() here - let the useEffect handle it
      // when currentUser is updated by Firebase
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign up with Google';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleFacebookSignUp = async () => {
    setError('');
    setLoading(true);

    try {
      await signInWithFacebook();
      // Don't call router.push() here - let the useEffect handle it
      // when currentUser is updated by Firebase
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign up with Facebook';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleGithubSignUp = async () => {
    setError('');
    setLoading(true);

    try {
      await signInWithGithub();
      // Don't call router.push() here - let the useEffect handle it
      // when currentUser is updated by Firebase
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign up with GitHub';
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
            <p className="text-gray-600">Join TripEase and start planning</p>
          </div>

          {/* Success Alert */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-900">Account created successfully! Redirecting...</p>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">{error}</p>
              </div>
            </div>
          )}

          {/* Sign Up Form */}
          <form onSubmit={handleEmailSignUp} className="space-y-4 mb-6">
            {/* Display Name Field */}
            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="John Doe"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={loading}
                  className="pl-10 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-500"
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="pl-10 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-500"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="pl-10 pr-10 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="pl-10 pr-10 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                disabled={loading}
                className="mt-1 w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="terms" className="text-sm text-gray-600">
                I agree to the{' '}
                <Link href="/terms" className="text-blue-600 hover:text-blue-700 font-medium">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-blue-600 hover:text-blue-700 font-medium">
                  Privacy Policy
                </Link>
              </label>
            </div>

            {/* Sign Up Button */}
            <Button
              type="submit"
              disabled={loading || success}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or sign up with</span>
            </div>
          </div>

          {/* Social Sign Up Buttons */}
          <div className="space-y-3 mb-6">
            <Button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={loading}
              variant="secondary"
              className="w-full border-gray-300 text-gray-900 hover:bg-gray-100 flex items-center justify-center gap-2"
            >
              <Chrome className="h-5 w-5" />
              Google
            </Button>

            <Button
              type="button"
              onClick={handleFacebookSignUp}
              disabled={loading}
              variant="secondary"
              className="w-full border-gray-300 text-gray-900 hover:bg-gray-100 flex items-center justify-center gap-2"
            >
              <Facebook className="h-5 w-5" />
              Facebook
            </Button>

            <Button
              type="button"
              onClick={handleGithubSignUp}
              disabled={loading}
              variant="secondary"
              className="w-full border-gray-300 text-gray-900 hover:bg-gray-100 flex items-center justify-center gap-2"
            >
              <Github className="h-5 w-5" />
              GitHub
            </Button>
          </div>

          {/* Sign In Link */}
          <div className="text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
