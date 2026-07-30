'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import LineWaves from '@/components/LineWaves';
import { isPPSUEmail } from '@/utils/validateEmail';
import { signIn } from '@/lib/auth';

export default function SigninPage() {
  const router = useRouter();

  // Field states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Error states
  const [emailError, setEmailError] = useState('');
  const [submitError, setSubmitError] = useState('');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validations on Blur
  const handleEmailBlur = () => {
    if (!email) {
      setEmailError('Email is required');
    } else if (!isPPSUEmail(email)) {
      setEmailError('Only @ppsu.ac.in emails are allowed');
    } else {
      setEmailError('');
    }
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (isPPSUEmail(val)) {
      setEmailError('');
    }
  };

  const isFormInvalid = !email || !password || !!emailError || !isPPSUEmail(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormInvalid) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setSubmitError(error.message);
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setSubmitError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        background: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
      }}
    >
      {/* 1. LineWaves Background */}
      <div className="absolute inset-0 w-full h-full z-0">
        <LineWaves
          color1="#ffffff"
          color2="#ffffff"
          color3="#ffffff"
          brightness={0.18}
          speed={0.25}
          warpIntensity={1.2}
          rotation={-45}
          enableMouseInteraction={false}
        />
      </div>

      {/* 2. Dark Overlay */}
      <div className="absolute inset-0 bg-[#000000]/65 z-10" style={{ backgroundColor: 'rgba(0,0,0,0.65)' }} />

      {/* 3. Center Card */}
      <div
        style={{
          position: 'relative',
          zIndex: 20,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          padding: '40px 32px',
          maxWidth: '420px',
          width: '90%',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
        }}
      >
        <form onSubmit={handleSubmit}>
          {/* युग्म logo text */}
          <div
            style={{
              fontFamily: 'var(--font-noto-serif-devanagari), Noto Serif Devanagari, serif',
              fontSize: '22px',
              fontWeight: 700,
              textAlign: 'center',
              marginBottom: '4px',
              color: 'white',
            }}
          >
            युग्म
          </div>

          {/* Subheading */}
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '20px',
              fontWeight: 600,
              color: 'white',
              textAlign: 'center',
              marginBottom: '24px',
            }}
          >
            Welcome back
          </div>

          {/* Inputs Container */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Email Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
              <input
                type="email"
                placeholder="your@ppsu.ac.in"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={handleEmailBlur}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: emailError ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  color: 'white',
                  fontSize: '14px',
                  width: '100%',
                  outline: 'none',
                }}
              />
              {emailError && (
                <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '2px', paddingLeft: '4px' }}>
                  {emailError}
                </div>
              )}
            </div>

            {/* Password Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    paddingRight: '48px',
                    color: 'white',
                    fontSize: '14px',
                    width: '100%',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'rgba(255, 255, 255, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isFormInvalid || isSubmitting}
              style={{
                background: '#ffffff',
                color: '#000000',
                borderRadius: '30px',
                padding: '14px',
                fontSize: '14px',
                fontWeight: 600,
                width: '100%',
                marginTop: '8px',
                border: 'none',
                cursor: isFormInvalid || isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isFormInvalid || isSubmitting ? 0.5 : 1,
                transition: 'opacity 0.2s ease',
              }}
            >
              {isSubmitting ? 'Signing in...' : 'Sign in →'}
            </button>

            {/* Submit Error */}
            {submitError && (
              <div
                style={{
                  color: '#ef4444',
                  fontSize: '13px',
                  textAlign: 'center',
                  marginTop: '8px',
                  lineHeight: '1.4',
                }}
              >
                {submitError}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div
          style={{
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.4)',
            textAlign: 'center',
            marginTop: '16px',
          }}
        >
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" style={{ color: '#ffffff', textDecoration: 'underline', fontWeight: 500 }}>
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
