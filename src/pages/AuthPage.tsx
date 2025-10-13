import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { z } from 'zod';

const signUpSchema = z.object({
  email: z.string().trim().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  username: z.string().trim().min(2, { message: "Username must be at least 2 characters" }).max(20, { message: "Username must be at most 20 characters" })
});

const signInSchema = z.object({
  email: z.string().trim().email({ message: "Please enter a valid email address" }),
  password: z.string().min(1, { message: "Please enter your password" })
});

const AuthPage: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const { signUp, signIn, user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      window.location.href = '/';
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage('');
    setLoading(true);

    try {
      if (isSignUp) {
        const result = signUpSchema.safeParse({ email, password, username });
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.issues.forEach(issue => {
            if (issue.path[0]) {
              fieldErrors[issue.path[0] as string] = issue.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, username);
        if (error) {
          setErrors({ general: error.message || 'Sign up failed, please try again' });
        } else {
          setSuccessMessage('Sign up successful! Welcome to Home of Your Pets');
          setTimeout(() => window.location.href = '/', 1500);
        }
      } else {
        const result = signInSchema.safeParse({ email, password });
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.issues.forEach(issue => {
            if (issue.path[0]) {
              fieldErrors[issue.path[0] as string] = issue.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }
        const { error } = await signIn(email, password);
        if (error) {
          setErrors({ general: error.message || 'Login failed, please check your email and password' });
        } else {
          setSuccessMessage('Login successful! Welcome back');
          setTimeout(() => window.location.href = '/', 1500);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 flex items-center justify-center p-4" style={{ fontFamily: "'Averia Serif Libre', serif" }}>
      <div className="w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border-2 border-purple-200">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-4xl">🐾</span>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Home of Your Pets
            </h1>
            <p className="text-purple-600">
              {isSignUp ? 'Create your account and start your pet journey' : 'Welcome back!'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {successMessage && (
              <div className="bg-green-50 border-2 border-green-200 text-green-700 p-4 rounded-xl">
                {successMessage}
              </div>
            )}

            {errors.general && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 p-4 rounded-xl">
                {errors.general}
              </div>
            )}

            {isSignUp && (
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-purple-700 mb-2">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-300/50 focus:border-pink-400"
                  placeholder="Enter your username"
                />
                {errors.username && (
                  <p className="text-red-500 text-sm mt-1">{errors.username}</p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-purple-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/80 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-300/50 focus:border-pink-400"
                placeholder="your@email.com"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-purple-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/80 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-300/50 focus:border-pink-400"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 px-6 rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                isSignUp ? 'Sign Up' : 'Sign In'
              )}
            </button>
          </form>

          {/* Toggle Sign Up/Sign In */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrors({});
              }}
              className="text-purple-600 hover:text-pink-600 font-medium transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-purple-200 text-center">
          <p className="text-sm text-purple-600">
            🔒 Your data is safe and secure
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;