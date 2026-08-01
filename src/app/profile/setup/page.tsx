'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import LineWaves from '@/components/LineWaves';
import { supabase } from '@/lib/supabase';

export default function ProfileSetupPage() {
  const router = useRouter();

  // Authentication check
  const [loadingUser, setLoadingUser] = useState(true);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/auth/signin');
      } else {
        setUserId(user.id);
        setLoadingUser(false);
      }
    }).catch(() => {
      router.push('/auth/signin');
    });
  }, [router]);

  // Current Step (1, 2, or 3)
  const [step, setStep] = useState(1);

  // STEP 1 State
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [birthdateError, setBirthdateError] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | ''>('');
  const [bio, setBio] = useState('');

  // STEP 2 State
  const [photos, setPhotos] = useState<(File | null)[]>([null, null, null]);
  const [previews, setPreviews] = useState<(string | null)[]>([null, null, null]);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // File input refs for photo slots
  const fileInputRef0 = useRef<HTMLInputElement>(null);
  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);
  const fileInputRefs = [fileInputRef0, fileInputRef1, fileInputRef2];

  // Helper to calculate age
  const calculateAge = (dobString: string) => {
    if (!dobString) return 0;
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleBirthdateChange = (val: string) => {
    setBirthdate(val);
    if (val) {
      const age = calculateAge(val);
      if (age < 18) {
        setBirthdateError('You must be 18 or older to use Yugma');
      } else {
        setBirthdateError('');
      }
    } else {
      setBirthdateError('');
    }
  };

  const handleSlotClick = (index: number) => {
    fileInputRefs[index].current?.click();
  };

  const handleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newPhotos = [...photos];
      newPhotos[index] = file;
      setPhotos(newPhotos);

      const newPreviews = [...previews];
      newPreviews[index] = URL.createObjectURL(file);
      setPreviews(newPreviews);
    }
  };

  const handleRemovePhoto = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newPhotos = [...photos];
    newPhotos[index] = null;
    setPhotos(newPhotos);

    // Clean up object URL preview to avoid leaks
    if (previews[index]) {
      URL.revokeObjectURL(previews[index]!);
    }
    const newPreviews = [...previews];
    newPreviews[index] = null;
    setPreviews(newPreviews);

    // Reset file input value so same image can be re-selected if wanted
    if (fileInputRefs[index].current) {
      fileInputRefs[index].current.value = '';
    }
  };

  // Step 1 Validation
  const isStep1Invalid = !name.trim() || !gender || !birthdate || !!birthdateError || calculateAge(birthdate) < 18;

  // Step 2 Validation
  const isStep2Invalid = photos.some((p) => p === null);

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    try {
      // 1. Upload photos to Cloudinary
      const uploadedUrls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const file = photos[i];
        if (!file) continue;

        const formData = new FormData();
        formData.append('file', file);
        formData.append(
          'upload_preset',
          process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'placeholder_preset'
        );

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${
            process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'placeholder_cloud'
          }/image/upload`,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (!res.ok) {
          throw new Error(`Failed to upload photo ${i + 1} to Cloudinary.`);
        }

        const data = await res.json();
        uploadedUrls.push(data.secure_url);
      }

      const tempPhoto = typeof window !== 'undefined' ? sessionStorage.getItem('temp_profile_photo') : null;

      // 2. Save profile info in Supabase
      const { error } = await supabase.from('profiles').insert({
        id: userId,
        name,
        birthdate,
        gender,
        bio,
        photos: uploadedUrls,
        profile_photo: tempPhoto || null,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('temp_profile_photo');
      }
      router.push('/dashboard');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setSubmitError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingUser) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.6)',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        Loading setup...
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        background: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 0',
        width: '100%',
        overflowX: 'hidden',
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
          maxWidth: '480px',
          width: '90%',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div
          style={{
            fontFamily: 'var(--font-noto-serif-devanagari), Noto Serif Devanagari, serif',
            fontSize: '20px',
            fontWeight: 700,
            color: 'white',
            textAlign: 'center',
            marginBottom: '4px',
          }}
        >
          युग्म
        </div>

        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '20px',
            fontWeight: 600,
            color: 'white',
            textAlign: 'center',
            marginBottom: '6px',
          }}
        >
          Set up your profile
        </div>

        <div
          style={{
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.4)',
            textAlign: 'center',
            marginBottom: '28px',
          }}
        >
          This is what others will see
        </div>

        {/* Step Indicator */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '28px',
          }}
        >
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              style={{
                width: step === s ? '24px' : '8px',
                height: '8px',
                background: step === s ? '#ffffff' : 'rgba(255, 255, 255, 0.2)',
                borderRadius: step === s ? '4px' : '50%',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* STEP 1: Basic Info */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Full Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  color: 'white',
                  fontSize: '14px',
                  width: '100%',
                  outline: 'none',
                }}
              />
            </div>

            {/* Birthdate */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <input
                type="date"
                value={birthdate}
                onChange={(e) => handleBirthdateChange(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: birthdateError ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  color: 'white',
                  fontSize: '14px',
                  width: '100%',
                  outline: 'none',
                }}
              />
              {birthdateError && (
                <div style={{ color: '#ef4444', fontSize: '12px', paddingLeft: '4px' }}>
                  {birthdateError}
                </div>
              )}
            </div>

            {/* Gender Selection */}
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button
                type="button"
                onClick={() => setGender('Male')}
                style={{
                  flex: 1,
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: gender === 'Male' ? '#ffffff' : 'rgba(255, 255, 255, 0.06)',
                  color: gender === 'Male' ? '#000000' : 'rgba(255, 255, 255, 0.6)',
                  border: gender === 'Male' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                Male
              </button>
              <button
                type="button"
                onClick={() => setGender('Female')}
                style={{
                  flex: 1,
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: gender === 'Female' ? '#ffffff' : 'rgba(255, 255, 255, 0.06)',
                  color: gender === 'Female' ? '#000000' : 'rgba(255, 255, 255, 0.6)',
                  border: gender === 'Female' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                Female
              </button>
            </div>

            {/* Bio Textarea */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}>
              <textarea
                placeholder="Write something about yourself... (optional)"
                maxLength={200}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  color: 'white',
                  fontSize: '14px',
                  width: '100%',
                  minHeight: '80px',
                  resize: 'none',
                  outline: 'none',
                }}
              />
              <div
                style={{
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.3)',
                  textAlign: 'right',
                  marginTop: '4px',
                }}
              >
                {bio.length}/200
              </div>
            </div>

            {/* Next Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button
                type="button"
                disabled={isStep1Invalid}
                onClick={() => setStep(2)}
                style={{
                  background: '#ffffff',
                  color: '#000000',
                  borderRadius: '30px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: isStep1Invalid ? 'not-allowed' : 'pointer',
                  opacity: isStep1Invalid ? 0.5 : 1,
                  transition: 'opacity 0.2s ease',
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Photos */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'white', marginBottom: '4px' }}>
              Add your photos
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.4)', marginBottom: '24px' }}>
              Minimum 3 photos required
            </div>

            {/* 3 Photo Slots */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', marginBottom: '28px' }}>
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  onClick={() => handleSlotClick(idx)}
                  style={{
                    flex: 1,
                    aspectRatio: '1/1',
                    border: '2px dashed rgba(255,255,255,0.2)',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    background: 'rgba(255,255,255,0.04)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRefs[idx]}
                    onChange={(e) => handleFileChange(idx, e)}
                    style={{ display: 'none' }}
                  />

                  {previews[idx] ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previews[idx]!}
                        alt={`Preview ${idx + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => handleRemovePhoto(idx, e)}
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          width: '20px',
                          height: '20px',
                          background: '#ffffff',
                          borderRadius: '50%',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        }}
                      >
                        <X size={12} color="#000000" />
                      </button>
                    </>
                  ) : (
                    <Plus size={24} color="#ffffff" />
                  )}
                </div>
              ))}
            </div>

            {/* Navigation buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  background: 'transparent',
                  color: 'rgba(255, 255, 255, 0.4)',
                  border: 'none',
                  fontSize: '14px',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                ← Back
              </button>
              <button
                type="button"
                disabled={isStep2Invalid}
                onClick={() => setStep(3)}
                style={{
                  background: '#ffffff',
                  color: '#000000',
                  borderRadius: '30px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: isStep2Invalid ? 'not-allowed' : 'pointer',
                  opacity: isStep2Invalid ? 0.5 : 1,
                  transition: 'opacity 0.2s ease',
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Review */}
        {step === 3 && (
          <form onSubmit={handleFinalSubmit}>
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'white', marginBottom: '20px' }}>
              Looks good?
            </div>

            {/* Preview Card */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Thumbnails Row */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {previews.map(
                  (preview, idx) =>
                    preview && (
                      <div key={idx} style={{ flex: 1, height: '80px', borderRadius: '8px', overflow: 'hidden' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={preview}
                          alt="Thumbnail"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      </div>
                    )
                )}
              </div>

              {/* Name & Age */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
                <span style={{ fontSize: '18px', fontWeight: 600, color: 'white' }}>
                  {name}, {calculateAge(birthdate)}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    borderRadius: '20px',
                    padding: '4px 10px',
                    fontWeight: 500,
                  }}
                >
                  {gender}
                </span>
              </div>

              {/* Bio */}
              {bio && (
                <div
                  style={{
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.5)',
                    marginTop: '8px',
                    lineHeight: '1.5',
                  }}
                >
                  {bio}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20px' }}>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  background: '#ffffff',
                  color: '#000000',
                  borderRadius: '30px',
                  padding: '14px',
                  fontSize: '14px',
                  fontWeight: 600,
                  width: '100%',
                  border: 'none',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.5 : 1,
                  transition: 'opacity 0.2s ease',
                }}
              >
                {isSubmitting ? 'Saving profile...' : "Looks good, let's go →"}
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setStep(1)}
                style={{
                  background: 'transparent',
                  color: 'rgba(255, 255, 255, 0.4)',
                  border: 'none',
                  fontSize: '14px',
                  marginTop: '8px',
                  cursor: 'pointer',
                }}
              >
                ← Edit
              </button>
            </div>

            {/* Error Message */}
            {submitError && (
              <div
                style={{
                  color: '#ef4444',
                  fontSize: '13px',
                  textAlign: 'center',
                  marginTop: '12px',
                  lineHeight: '1.4',
                }}
              >
                {submitError}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
