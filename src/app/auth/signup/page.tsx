'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Plus } from 'lucide-react';
import LineWaves from '@/components/LineWaves';
import { isPPSUEmail } from '@/utils/validateEmail';
import { signUp } from '@/lib/auth';

export default function SignupPage() {
  const router = useRouter();

  // Field states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Error states
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [submitError, setSubmitError] = useState('');

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Profile photo states
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePhotoFile(file);
      setProfilePhotoPreview(URL.createObjectURL(file));
    }
  };

  // Form validations on Blur
  const handleEmailBlur = () => {
    if (!email) {
      setEmailError('Email is required');
    } else if (!isPPSUEmail(email)) {
      setEmailError('Only @ppsu.ac.in emails are allowed');
    } else {
      setEmailError('');
    }
  };

  const handlePasswordBlur = () => {
    if (!password) {
      setPasswordError('Password is required');
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
    } else {
      setPasswordError('');
    }
  };

  const handleConfirmPasswordBlur = () => {
    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
    } else if (confirmPassword !== password) {
      setConfirmPasswordError('Passwords do not match');
    } else {
      setConfirmPasswordError('');
    }
  };

  // Live checks to clear errors when user types valid input
  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (isPPSUEmail(val)) {
      setEmailError('');
    }
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (val.length >= 8) {
      setPasswordError('');
    }
    // Update confirmation error live if it was set
    if (confirmPassword && val === confirmPassword) {
      setConfirmPasswordError('');
    }
  };

  const handleConfirmPasswordChange = (val: string) => {
    setConfirmPassword(val);
    if (val === password) {
      setConfirmPasswordError('');
    }
  };

  const isFormInvalid =
    !email ||
    !password ||
    !confirmPassword ||
    !!emailError ||
    !!passwordError ||
    !!confirmPasswordError ||
    !isPPSUEmail(email) ||
    password.length < 8 ||
    password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormInvalid) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      let uploadedProfilePhotoUrl = '';
      if (profilePhotoFile) {
        const formData = new FormData();
        formData.append('file', profilePhotoFile);
        formData.append(
          'upload_preset',
          process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'yugma_uploads'
        );

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${
            process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'ngt1g6gu'
          }/image/upload`,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (!res.ok) {
          throw new Error('Failed to upload profile photo to Cloudinary.');
        }

        const data = await res.json();
        uploadedProfilePhotoUrl = data.secure_url;
      }

      const { error } = await signUp(email, password);
      if (error) {
        setSubmitError(error.message);
      } else {
        if (uploadedProfilePhotoUrl) {
          sessionStorage.setItem('temp_profile_photo', uploadedProfilePhotoUrl);
        } else {
          sessionStorage.removeItem('temp_profile_photo');
        }
        router.push('/profile/setup');
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
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          padding: '40px 32px',
          maxWidth: '420px',
          width: '90%',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
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
            Create your account
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
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  onBlur={handlePasswordBlur}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: passwordError ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
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
              {passwordError && (
                <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '2px', paddingLeft: '4px' }}>
                  {passwordError}
                </div>
              )}
            </div>

            {/* Confirm Password Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  onBlur={handleConfirmPasswordBlur}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: confirmPasswordError ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
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
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {confirmPasswordError && (
                <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '2px', paddingLeft: '4px' }}>
                  {confirmPasswordError}
                </div>
              )}
            </div>

            {/* Profile Photo Upload Step */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '4px', marginBottom: '4px' }}>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                Profile Photo (Optional)
              </div>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  border: '2px dashed rgba(255,255,255,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  position: 'relative',
                  background: 'rgba(255,255,255,0.03)'
                }}
              >
                {profilePhotoPreview ? (
                  <img
                    src={profilePhotoPreview}
                    alt="Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Plus size={20} color="rgba(255,255,255,0.4)" />
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                {profilePhotoFile ? 'Photo selected' : 'Tap to upload'}
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
              {isSubmitting ? 'Creating account...' : 'Continue →'}
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
          Already have an account?{' '}
          <Link href="/auth/signin" style={{ color: '#ffffff', textDecoration: 'underline', fontWeight: 500 }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
