'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Chrome, Facebook, Github, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  signInWithEmail,
  signInWithGoogle,
  signInWithFacebook,
  signInWithGithub,
} from '@/lib/auth-utils';
import { useAuth } from '@/hooks/use-auth';

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already logged in (but wait for auth to load first)
  useEffect(() => {
    if (!authLoading && currentUser) {
      // If the user visits /login while already authenticated,
      // send them to the main screen inside the app.
      router.replace('/planner');
    }
  }, [authLoading, currentUser, router]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !password) {
        throw new Error('Please fill in all fields');
      }

  await signInWithEmail(email, password);
  // Redirect to external shell after successful login
  window.location.replace('http://localhost:9002/');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
  await signInWithGoogle();
  // Redirect to external shell after successful login
  window.location.replace('http://localhost:9002/');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in with Google';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setError('');
    setLoading(true);

    try {
  await signInWithFacebook();
  // Redirect to external shell after successful login
  window.location.replace('http://localhost:9002/');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in with Facebook';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    setError('');
    setLoading(true);

    try {
  await signInWithGithub();
  // Redirect to external shell after successful login
  window.location.replace('http://localhost:9002/');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in with GitHub';
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-gray-600">Sign in to your TripEase account</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">{error}</p>
              </div>
            </div>
          )}

          {/* Email Sign In Form */}
          <form onSubmit={handleEmailSignIn} className="space-y-4 mb-6">
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
              <div className="flex items-center justify-between mb-2">
                <Label className="text-gray-700 font-medium">Password</Label>
                <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
                  Forgot password?
                </Link>
              </div>
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

            {/* Sign In Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          {/* Social Sign In Buttons */}
          <div className="space-y-3 mb-6">
            <Button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              variant="secondary"
              className="w-full border-gray-300 text-gray-900 hover:bg-gray-100 flex items-center justify-center gap-2"
            >
              <Chrome className="h-5 w-5" />
              Google
            </Button>

            <Button
              type="button"
              onClick={handleFacebookSignIn}
              disabled={loading}
              variant="secondary"
              className="w-full border-gray-300 text-gray-900 hover:bg-gray-100 flex items-center justify-center gap-2"
            >
              <Facebook className="h-5 w-5" />
              Facebook
            </Button>

            <Button
              type="button"
              onClick={handleGithubSignIn}
              disabled={loading}
              variant="secondary"
              className="w-full border-gray-300 text-gray-900 hover:bg-gray-100 flex items-center justify-center gap-2"
            >
              <Github className="h-5 w-5" />
              GitHub
            </Button>
          </div>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link href="/signup" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign up here
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Text */}
        <p className="text-center text-gray-600 text-sm mt-8">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="text-blue-600 hover:text-blue-700">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-blue-600 hover:text-blue-700">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
