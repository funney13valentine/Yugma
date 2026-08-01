'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Pencil } from 'lucide-react'
import LineWaves from '@/components/LineWaves'
import supabase from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'

interface Profile {
  id: string
  name: string
  birthdate: string
  gender: string
  bio: string
  photos: string[]
  profile_photo?: string
}

export default function ProfileMePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Edit Bio state
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [editedBio, setEditedBio] = useState('')

  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Calculate age based on birthdate string (YYYY-MM-DD)
  const calculateAge = (dobString: string) => {
    if (!dobString) return 0
    const today = new Date()
    const birthDate = new Date(dobString)
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  useEffect(() => {
    async function loadUserProfile() {
      try {
        setLoading(true)

        // 1. Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          router.push('/auth/signin')
          return
        }
        setCurrentUser(user)

        // 2. Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError || !profileData) {
          console.error('Profile not found or error occurred:', profileError)
          router.push('/profile/setup')
          return
        }

        setProfile(profileData)
        setEditedBio(profileData.bio || '')
      } catch (err) {
        console.error('Error loading user profile:', err)
      } finally {
        setLoading(false)
      }
    }

    loadUserProfile()
  }, [router])

  // Save new bio to profiles table
  const handleSaveBio = async () => {
    if (!currentUser) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ bio: editedBio })
        .eq('id', currentUser.id)

      if (error) {
        console.error('Error updating bio:', error)
      } else {
        setProfile((prev) => (prev ? { ...prev, bio: editedBio } : null))
        setIsEditingBio(false)
      }
    } catch (err) {
      console.error('Error executing save bio:', err)
    }
  }

  // Upload and change profile photo
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentUser) return

    try {
      setUploadingAvatar(true)
      const formData = new FormData()
      formData.append('file', file)
      formData.append(
        'upload_preset',
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'yugma_uploads'
      )

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${
          process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'ngt1g6gu'
        }/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      )

      if (!res.ok) {
        throw new Error('Failed to upload profile photo to Cloudinary.')
      }

      const data = await res.json()
      const newPhotoUrl = data.secure_url

      // Update profiles table
      const { error } = await supabase
        .from('profiles')
        .update({ profile_photo: newPhotoUrl })
        .eq('id', currentUser.id)

      if (error) {
        throw new Error(error.message)
      }

      setProfile((prev) => (prev ? { ...prev, profile_photo: newPhotoUrl } : null))
    } catch (err) {
      console.error('Error updating avatar:', err)
    } finally {
      setUploadingAvatar(false)
    }
  }

  // Sign out handler
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/')
    } catch (err) {
      console.error('Error signing out:', err)
    }
  }

  // Fallback profile photo selection
  const getAvatarUrl = () => {
    if (profile?.profile_photo) return profile.profile_photo
    if (profile?.photos && profile.photos.length > 0) return profile.photos[0]
    return '/placeholder.jpg'
  }

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      background: '#000000',
      display: 'flex',
      flexDirection: 'column',
      overflowX: 'hidden',
      fontFamily: 'Inter, sans-serif',
      boxSizing: 'border-box'
    }}>
      {/* LineWaves Background Wrapper */}
      <div style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0
      }}>
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

      {/* Dark overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        zIndex: 10,
        pointerEvents: 'none'
      }} />

      {/* Main Profile Layout Container */}
      <div style={{
        position: 'relative',
        zIndex: 20,
        maxWidth: '480px',
        width: '100%',
        margin: '0 auto',
        paddingBottom: '100px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        flex: 1
      }}>
        {loading ? (
          /* Loading Spinner */
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, minHeight: '60vh' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.1)',
              borderTopColor: '#6366f1',
              animation: 'spin 1s linear infinite'
            }} />
            <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
          </div>
        ) : profile ? (
          <>
            {/* TOP SECTION */}
            <div style={{
              textAlign: 'center',
              padding: '32px 16px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              {/* Circular profile photo */}
              <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                <img
                  src={getAvatarUrl()}
                  alt={profile.name}
                  style={{
                    width: '100px',
                    height: '100px',
                    objectFit: 'cover',
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.2)'
                  }}
                />
                
                {/* Small camera icon overlay bottom right */}
                <div
                  onClick={() => avatarInputRef.current?.click()}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                    zIndex: 25
                  }}
                >
                  <Camera size={12} color="#000000" />
                </div>
                <input
                  type="file"
                  ref={avatarInputRef}
                  onChange={handleAvatarChange}
                  accept="image/*"
                  style={{ display: 'none' }}
                />

                {/* Uploading loading overlay */}
                {uploadingAvatar && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.6)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 24
                  }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.2)',
                      borderTopColor: '#ffffff',
                      animation: 'spin 1s linear infinite'
                    }} />
                  </div>
                )}
              </div>

              {/* Name */}
              <div style={{
                fontSize: '22px',
                fontWeight: 700,
                color: 'white',
                marginTop: '16px'
              }}>
                {profile.name}
              </div>

              {/* Age and gender on same line */}
              <div style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.5)',
                marginTop: '4px'
              }}>
                {calculateAge(profile.birthdate)} • {profile.gender}
              </div>
            </div>

            {/* ABOUT ME SECTION */}
            <div style={{
              margin: '0 16px',
              marginTop: '24px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '16px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'white' }}>
                  About Me
                </span>
                {!isEditingBio && (
                  <Pencil
                    size={16}
                    color="rgba(255,255,255,0.4)"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setEditedBio(profile.bio || '')
                      setIsEditingBio(true)
                    }}
                  />
                )}
              </div>

              {isEditingBio ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                  <textarea
                    value={editedBio}
                    onChange={(e) => setEditedBio(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '8px',
                      padding: '10px',
                      color: 'white',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setEditedBio(profile.bio || '')
                        setIsEditingBio(false)
                      }}
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        color: 'white',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveBio}
                      style={{
                        background: '#6366f1',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        color: 'white',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p style={{
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.6)',
                  lineHeight: 1.6,
                  marginTop: '8px',
                  marginBottom: 0,
                  whiteSpace: 'pre-wrap'
                }}>
                  {profile.bio || 'No bio written yet.'}
                </p>
              )}
            </div>

            {/* MY PHOTOS SECTION */}
            <div style={{
              margin: '0 16px',
              marginTop: '16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '16px'
            }}>
              <div style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'white',
                marginBottom: '12px'
              }}>
                My Photos
              </div>
              
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                {[0, 1, 2].map((idx) => {
                  const photoUrl = profile.photos && profile.photos[idx]
                  return (
                    <div
                      key={idx}
                      style={{
                        flex: 1,
                        height: '110px',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        position: 'relative'
                      }}
                    >
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt={`Photo ${idx + 1}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'rgba(255,255,255,0.15)',
                          fontSize: '12px'
                        }}>
                          Empty
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* SIGN OUT BUTTON */}
            <div style={{ margin: '16px', marginTop: '8px' }}>
              <button
                onClick={handleSignOut}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '14px',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'color 0.2s, border-color 0.2s, background-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.4)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                Sign out
              </button>
            </div>
          </>
        ) : (
          <div style={{ color: 'white', textAlign: 'center', marginTop: '40px' }}>
            Failed to load profile.
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
