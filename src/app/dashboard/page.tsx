'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, X, Star } from 'lucide-react'
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
}

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [matchPopupProfile, setMatchPopupProfile] = useState<Profile | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [fullScreenPhoto, setFullScreenPhoto] = useState<string|null>(null)
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState<string|null>(null)
  const [reportSubmitted, setReportSubmitted] = useState(false)

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
    async function loadData() {
      try {
        setLoading(true)

        // 1. Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          router.push('/auth/signin')
          return
        }
        setCurrentUser(user)

        // 2. Get current user profile from profiles table where id = user.id
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError || !profile) {
          router.push('/profile/setup')
          return
        }
        setCurrentUserProfile(profile)

        // 3. Fetch profiles where gender is opposite of current user gender, exclude current user id, exclude profiles already in likes table where from_user = current user id
        const targetGender = profile.gender === 'Male' ? 'Female' : 'Male'

        // Get likes by the current user
        const { data: likedData, error: likedError } = await supabase
          .from('likes')
          .select('to_user')
          .eq('from_user', user.id)

        if (likedError) {
          console.error('Error fetching user likes:', likedError)
        }
        const likedIds = likedData ? likedData.map((l: any) => l.to_user) : []

        // Query profiles of target gender excluding current user id
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .eq('gender', targetGender)
          .neq('id', user.id)

        if (profilesError) {
          console.error('Error fetching matching profiles:', profilesError)
        }

        // Exclude profiles already in likes table
        const filteredProfiles = (profilesData || []).filter(
          (p: Profile) => !likedIds.includes(p.id)
        )

        setProfiles(filteredProfiles)
      } catch (err) {
        console.error('Error loading dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  // On heart or star click
  const handleLike = async (isStar: boolean) => {
    const profile = profiles[currentIndex]
    if (!profile || !currentUser) return

    // Move to next profile
    setCurrentIndex(prev => prev + 1)

    try {
      // 1. Insert into likes table: { from_user: currentUser.id, to_user: profile.id }
      const { error: likeError } = await supabase
        .from('likes')
        .insert({
          from_user: currentUser.id,
          to_user: profile.id
        })

      if (likeError) {
        console.error('Error inserting like:', likeError)
      }

      // 2. Check if reverse like exists: select from likes where from_user = profile.id AND to_user = currentUser.id
      const { data: reverseLike, error: reverseLikeError } = await supabase
        .from('likes')
        .select('*')
        .eq('from_user', profile.id)
        .eq('to_user', currentUser.id)
        .maybeSingle()

      if (reverseLikeError) {
        console.error('Error checking reverse like:', reverseLikeError)
      }

      // 3. If reverse like exists = MATCH
      if (reverseLike) {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        const { error: matchError } = await supabase
          .from('matches')
          .insert({
            user1: currentUser.id,
            user2: profile.id,
            expires_at: expiresAt
          })

        if (matchError) {
          console.error('Error inserting match:', matchError)
        }

        // Show match popup
        setMatchPopupProfile(profile)
      }
    } catch (err) {
      console.error('Error executing like logic:', err)
    }
  }

  // On X click: just move to next profile, no DB insert
  const handlePass = () => {
    setCurrentIndex(prev => prev + 1)
  }

  const currentProfile = profiles[currentIndex]

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      background: '#000000',
      display: 'flex',
      flexDirection: 'column',
      overflowX: 'hidden',
      fontFamily: 'Inter, sans-serif',
      paddingBottom: '80px'
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
        background: 'rgba(0,0,0,0.5)',
        zIndex: 10,
        pointerEvents: 'none'
      }} />

      {/* Top Bar */}
      <div style={{
        position: 'relative',
        zIndex: 20,
        padding: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%'
      }}>
        <span style={{
          fontSize: '20px',
          fontWeight: 700,
          color: '#ffffff',
          fontFamily: 'var(--font-noto-serif-devanagari), Noto Serif Devanagari, serif'
        }}>
          युग्म
        </span>
        <Heart
          size={24}
          color="#ffffff"
          style={{ cursor: 'pointer' }}
          onClick={() => router.push('/matches')}
        />
      </div>

      {loading ? (
        /* LOADING STATE */
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flex: 1,
          position: 'relative',
          zIndex: 20
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: '#6366f1',
            animation: 'spin 1s linear infinite',
          }} />
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          ` }} />
        </div>
      ) : currentProfile ? (
        /* MAIN SWIPE STATE */
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifyContent: 'center',
          paddingBottom: '24px'
        }}>
          {/* Profile Card */}
          <div style={{
            maxWidth: '380px',
            width: '100%',
            margin: '0 auto',
            position: 'relative',
            zIndex: 20,
            padding: '0 16px'
          }}>
            <div 
              onClick={() => setShowProfile(true)}
              style={{
                borderRadius: '24px',
                overflow: 'hidden',
                position: 'relative',
                background: '#1c1c1e',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer'
              }}
            >
              <img
                src={currentProfile.photos && currentProfile.photos.length > 0 ? currentProfile.photos[0] : '/placeholder.jpg'}
                alt={currentProfile.name}
                style={{
                  width: '100%',
                  height: '480px',
                  objectFit: 'cover',
                  objectPosition: 'center top',
                  display: 'block'
                }}
              />
              
              {/* Gradient Overlay at bottom */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '200px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                pointerEvents: 'none'
              }} />

              {/* Profile Details on bottom of photo */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px', zIndex: 5 }}>
                <div style={{ fontSize: '26px', fontWeight: 700, color: '#ffffff' }}>
                  {currentProfile.name}, {calculateAge(currentProfile.birthdate)}
                </div>
                <p style={{
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.7)',
                  marginTop: '4px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  margin: '4px 0 0 0'
                }}>
                  {currentProfile.bio}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '20px',
            padding: '24px 16px',
            position: 'relative',
            zIndex: 20
          }}>
            {/* Pass Button */}
            <button
              onClick={handlePass}
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                outline: 'none',
                transition: 'transform 0.2s, background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)'
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
              }}
            >
              <X size={28} color="#ff6b6b" />
            </button>

            {/* Like Button */}
            <button
              onClick={() => handleLike(false)}
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                outline: 'none',
                transition: 'transform 0.2s, background-color 0.2s',
                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)'
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.25)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'
              }}
            >
              <Heart size={30} color="#ef4444" fill="#ef4444" />
            </button>

            {/* Star Button */}
            <button
              onClick={() => handleLike(true)}
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                outline: 'none',
                transition: 'transform 0.2s, background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)'
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
              }}
            >
              <Star size={26} color="#ffd93d" fill="#ffd93d" />
            </button>
          </div>
        </div>
      ) : (
        /* NO MORE PROFILES STATE */
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          flex: 1,
          padding: '40px 20px',
          textAlign: 'center',
          position: 'relative',
          zIndex: 20
        }}>
          <Heart size={48} color="rgba(255,255,255,0.2)" />
          <div style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '16px' }}>
            {"You've seen everyone for now"}
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
            Check back later
          </div>
        </div>
      )}

      {/* MATCH POPUP */}
      {matchPopupProfile && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.9)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          ` }} />
          <h2 style={{ fontSize: '32px', fontWeight: 700, color: 'white', textAlign: 'center' }}>
            {"It's a Match! 🎉"}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '20px 0' }}>
            {/* Current User Avatar */}
            <img
              src={currentUserProfile?.photos && currentUserProfile.photos.length > 0 ? currentUserProfile.photos[0] : '/placeholder.jpg'}
              alt={currentUserProfile?.name || 'You'}
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid white'
              }}
            />
            {/* Heart Icon */}
            <Heart size={24} color="#6366f1" fill="#6366f1" />
            {/* Matched User Avatar */}
            <img
              src={matchPopupProfile.photos && matchPopupProfile.photos.length > 0 ? matchPopupProfile.photos[0] : '/placeholder.jpg'}
              alt={matchPopupProfile.name}
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid white'
              }}
            />
          </div>
          <button
            onClick={() => router.push('/matches')}
            style={{
              background: '#6366f1',
              color: 'white',
              borderRadius: '30px',
              padding: '14px 32px',
              fontSize: '16px',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6366f1'}
          >
            Start chatting →
          </button>
          <div
            onClick={() => setMatchPopupProfile(null)}
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '14px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
          >
            Keep swiping
          </div>
        </div>
      )}

      {/* Full screen profile overlay */}
      {showProfile && currentProfile && (
        <div style={{position:'fixed',inset:0,zIndex:999,background:'#0a0a0a',overflowY:'auto',fontFamily:'Inter,sans-serif'}}>
          
          {/* Close button */}
          <div style={{position:'fixed',top:16,right:16,zIndex:1000,display:'flex',gap:8}}>
            <button 
              onClick={() => setShowReport(true)}
              style={{width:40,height:40,borderRadius:'50%',background:'rgba(0,0,0,0.6)',backdropFilter:'blur(10px)',border:'1px solid rgba(255,255,255,0.15)',color:'white',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}
            >🚩</button>
            <button 
              onClick={() => setShowProfile(false)}
              style={{width:40,height:40,borderRadius:'50%',background:'rgba(0,0,0,0.6)',backdropFilter:'blur(10px)',border:'1px solid rgba(255,255,255,0.15)',color:'white',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}
            >✕</button>
          </div>

          {/* HERO PHOTO */}
          <div style={{width:'100%',height:'65vh',position:'relative',overflow:'hidden'}}>
            <img 
              src={currentProfile.photos && currentProfile.photos[0] ? currentProfile.photos[0] : '/placeholder.jpg'} 
              alt={currentProfile.name}
              style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center top'}} 
            />
            <div style={{position:'absolute',bottom:0,left:0,right:0,height:'50%',background:'linear-gradient(transparent,#0a0a0a)'}} />
            
            <div style={{position:'absolute',bottom:20,left:20,right:20}}>
              <div style={{fontSize:28,fontWeight:700,color:'white',textShadow:'0 2px 8px rgba(0,0,0,0.8)'}}>
                {currentProfile.name}, {calculateAge(currentProfile.birthdate)}
              </div>
              <div style={{fontSize:14,color:'rgba(255,255,255,0.7)',marginTop:4}}>{currentProfile.gender}</div>
            </div>

            {/* Photo dots */}
            {currentProfile.photos && currentProfile.photos.length > 1 && (
              <div style={{position:'absolute',top:12,left:12,right:12,display:'flex',gap:4}}>
                {currentProfile.photos.map((_,i) => (
                  <div key={i} style={{flex:1,height:3,borderRadius:2,background:i===0?'white':'rgba(255,255,255,0.35)'}} />
                ))}
              </div>
            )}
          </div>

          {/* ABOUT SECTION */}
          {currentProfile.bio && (
            <div style={{margin:'16px 16px 0',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:16,padding:16}}>
              <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:8,letterSpacing:'0.05em',textTransform:'uppercase'}}>About</div>
              <div style={{fontSize:15,color:'rgba(255,255,255,0.85)',lineHeight:1.6}}>{currentProfile.bio}</div>
            </div>
          )}

          {/* PHOTOS GRID */}
          {currentProfile.photos && currentProfile.photos.length > 0 && (
            <div style={{margin:'12px 16px 0',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:16,padding:16}}>
              <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:12,letterSpacing:'0.05em',textTransform:'uppercase'}}>Photos</div>
              <div style={{display:'flex',gap:8}}>
                {currentProfile.photos.slice(0,3).map((photo,i) => (
                  <img key={i} src={photo} alt={`photo ${i+1}`} style={{flex:1,height:110,objectFit:'cover',objectPosition:'center top',borderRadius:10,cursor:'pointer'}} onClick={() => setFullScreenPhoto(photo)} />
                ))}
              </div>
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div style={{margin:'16px',display:'flex',gap:12,paddingBottom:32}}>
            <button onClick={() => { setShowProfile(false); handlePass(); }} style={{flex:1,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:30,padding:'14px',color:'white',fontSize:15,cursor:'pointer'}}>Pass</button>
            <button onClick={() => { setShowProfile(false); handleLike(false); }} style={{flex:1,background:'#ef4444',borderRadius:30,padding:'14px',color:'white',fontSize:15,fontWeight:600,border:'none',cursor:'pointer'}}>Like ❤️</button>
          </div>

          {showReport && (
            <div style={{position:'fixed',inset:0,zIndex:1001,background:'rgba(0,0,0,0.85)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
              <div style={{background:'#111',border:'1px solid rgba(255,255,255,0.1)',borderRadius:20,padding:28,width:'100%',maxWidth:360}}>
                
                {!reportSubmitted ? (
                  <>
                    <div style={{fontSize:18,fontWeight:600,color:'white',textAlign:'center',marginBottom:8}}>Report Profile</div>
                    <div style={{fontSize:13,color:'rgba(255,255,255,0.5)',textAlign:'center',marginBottom:24}}>Why are you reporting this profile?</div>
                    
                    <div style={{display:'flex',flexDirection:'column',gap:10}}>
                      {['Fake profile','Inappropriate photos','Harassment','Spam'].map(reason => (
                        <button
                          key={reason}
                          onClick={() => setReportReason(reason)}
                          style={{
                            padding:'12px 16px',
                            borderRadius:12,
                            border: reportReason===reason ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                            background: reportReason===reason ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
                            color: reportReason===reason ? 'white' : 'rgba(255,255,255,0.6)',
                            fontSize:14,
                            textAlign:'left',
                            cursor:'pointer'
                          }}
                        >{reason}</button>
                      ))}
                    </div>

                    <button
                      onClick={async () => {
                        if (!reportReason || !currentUser || !currentProfile) return
                        await supabase.from('reports').insert({
                          reported_by: currentUser.id,
                          reported_user: currentProfile.id,
                          reason: reportReason
                        })
                        setReportSubmitted(true)
                      }}
                      disabled={!reportReason}
                      style={{
                        width:'100%',
                        marginTop:20,
                        padding:'14px',
                        borderRadius:30,
                        background: reportReason ? '#ef4444' : 'rgba(255,255,255,0.1)',
                        color:'white',
                        fontSize:15,
                        fontWeight:600,
                        border:'none',
                        cursor: reportReason ? 'pointer' : 'not-allowed',
                        opacity: reportReason ? 1 : 0.5
                      }}
                    >Submit Report</button>

                    <button
                      onClick={() => { setShowReport(false); setReportReason(null); }}
                      style={{width:'100%',marginTop:12,padding:'10px',background:'transparent',border:'none',color:'rgba(255,255,255,0.4)',fontSize:14,cursor:'pointer'}}
                    >Cancel</button>
                  </>
                ) : (
                  <>
                    <div style={{textAlign:'center',padding:'20px 0'}}>
                      <div style={{fontSize:32,marginBottom:12}}>✅</div>
                      <div style={{fontSize:18,fontWeight:600,color:'white',marginBottom:8}}>Report Submitted</div>
                      <div style={{fontSize:14,color:'rgba(255,255,255,0.5)',marginBottom:24}}>Thank you. We will review this profile.</div>
                      <button
                        onClick={() => { setShowReport(false); setShowProfile(false); setReportReason(null); setReportSubmitted(false); handlePass(); }}
                        style={{padding:'12px 28px',borderRadius:30,background:'#ef4444',color:'white',fontSize:14,fontWeight:600,border:'none',cursor:'pointer'}}
                      >Continue swiping</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Full screen photo view overlay */}
      {fullScreenPhoto && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          background: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <img
            src={fullScreenPhoto}
            alt="Full screen photo"
            style={{
              maxWidth: '100%',
              maxHeight: '100vh',
              objectFit: 'contain'
            }}
          />
          <button
            onClick={() => setFullScreenPhoto(null)}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              color: 'white',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
