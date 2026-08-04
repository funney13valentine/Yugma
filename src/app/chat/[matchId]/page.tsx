'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Heart, Send } from 'lucide-react'
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

interface Match {
  id: string
  user1: string
  user2: string
  expires_at: string
}

interface Message {
  id: string
  match_id: string
  sender_id: string
  content: string
  created_at: string
}

export default function ChatPage() {
  const router = useRouter()
  const params = useParams()
  const matchId = params.matchId as string

  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [match, setMatch] = useState<Match | null>(null)
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isMatchExpired, setIsMatchExpired] = useState(false)

  // Profile overlay state
  const [showProfile, setShowProfile] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState<string|null>(null)
  const [reportSubmitted, setReportSubmitted] = useState(false)
  
  // Timer States
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null)
  const [isUrgent, setIsUrgent] = useState(false)

  // Toast alert state
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Auto-scroll target ref
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch initial data
  useEffect(() => {
    async function loadChatDetails() {
      try {
        setLoading(true)

        // 1. Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          router.push('/auth/signin')
          return
        }
        setCurrentUser(user)

        // 2. Fetch match details from matches table
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .select('*')
          .eq('id', matchId)
          .single()

        if (matchError || !matchData) {
          console.error('Match not found or error occurred:', matchError)
          router.push('/dashboard')
          return
        }

        // 3. Authorization check
        if (matchData.user1 !== user.id && matchData.user2 !== user.id) {
          router.push('/dashboard')
          return
        }

        setMatch(matchData)

        // 4. Expiration check
        const isExpired = new Date(matchData.expires_at).getTime() < Date.now()
        if (isExpired) {
          setIsMatchExpired(true)
          setLoading(false)
          return
        }

        // 5. Fetch recipient's profile details
        const otherUserId = matchData.user1 === user.id ? matchData.user2 : matchData.user1
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', otherUserId)
          .single()

        if (profileError || !profileData) {
          console.error('Error fetching recipient profile:', profileError)
        } else {
          setOtherProfile(profileData)
        }

        // 6. Fetch existing messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('match_id', matchId)
          .order('created_at', { ascending: true })

        if (messagesError) {
          console.error('Error fetching messages:', messagesError)
        } else {
          setMessages(messagesData || [])
        }

      } catch (err) {
        console.error('Error in chat loading sequence:', err)
      } finally {
        setLoading(false)
      }
    }

    if (matchId) {
      loadChatDetails()
    }
  }, [matchId, router])

  // Realtime subscription setup
  useEffect(() => {
    if (!matchId) return

    const channel = supabase
      .channel(`chat_room_${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`
        },
        (payload) => {
          setMessages((prev) => {
            // Deduplicate local optimistic messages
            if (prev.some((msg) => msg.id === payload.new.id)) return prev
            return [...prev, payload.new as Message]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [matchId])

  // Expiry countdown calculations
  useEffect(() => {
    if (!match) return

    const updateTimer = () => {
      const expiresAt = new Date(match.expires_at).getTime()
      const now = Date.now()
      const diffMs = expiresAt - now

      if (diffMs <= 0) {
        setIsMatchExpired(true)
        setTimeRemaining(null)
        setIsUrgent(false)
        return
      }

      const totalMinutes = Math.floor(diffMs / (1000 * 60))
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60

      if (hours < 6) {
        setTimeRemaining(`${hours}h ${minutes}m left`)
        setIsUrgent(true)
      } else {
        setTimeRemaining(null)
        setIsUrgent(false)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 30000) // Update timer every 30s
    return () => clearInterval(interval)
  }, [match])

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Send Message Logic
  const handleSend = async () => {
    if (!inputText.trim() || !currentUser || !matchId) return

    const message = inputText.trim()

    // Contact sharing safety validation regex
    const blocked = /(\+91|[6-9]\d{9}|@[a-zA-Z0-9_]+|instagram|snapchat|whatsapp|telegram)/i
    if (blocked.test(message)) {
      setToastMessage('Sharing personal contact info is not allowed')
      setTimeout(() => setToastMessage(null), 3000)
      return
    }

    // Clear input optimistically
    setInputText('')

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          match_id: matchId,
          sender_id: currentUser.id,
          content: message
        })
        .select()
        .single()

      if (error) {
        console.error('Error inserting message:', error)
      } else if (data) {
        // Append message to state if subscription hasn't caught it yet
        setMessages((prev) => {
          if (prev.some((msg) => msg.id === data.id)) return prev
          return [...prev, data as Message]
        })
      }
    } catch (err) {
      console.error('Send error:', err)
    }
  }

  // Format date helper
  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    } catch (e) {
      return ''
    }
  }

  if (loading) {
    return (
      <div style={{
        position: 'relative',
        minHeight: '100vh',
        background: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif'
      }}>
        {/* LineWaves Background Wrapper */}
        <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }}>
          <LineWaves color1="#ffffff" color2="#ffffff" color3="#ffffff" brightness={0.18} speed={0.25} warpIntensity={1.2} rotation={-45} enableMouseInteraction={false} />
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 10, pointerEvents: 'none' }} />
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: '#6366f1',
          zIndex: 20,
          animation: 'spin 1s linear infinite'
        }} />
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
      </div>
    )
  }

  if (isMatchExpired) {
    return (
      <div style={{
        position: 'relative',
        minHeight: '100vh',
        background: '#000000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
        fontFamily: 'Inter, sans-serif',
        gap: '20px'
      }}>
        {/* LineWaves Background Wrapper */}
        <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }}>
          <LineWaves color1="#ffffff" color2="#ffffff" color3="#ffffff" brightness={0.18} speed={0.25} warpIntensity={1.2} rotation={-45} enableMouseInteraction={false} />
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 10, pointerEvents: 'none' }} />
        
        <div style={{ zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '20px', fontWeight: 600, color: 'white' }}>
            This match has expired
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', maxWidth: '280px', lineHeight: 1.5 }}>
            Matches expire after 24 hours if no message is sent.
          </div>
          <button
            onClick={() => router.push('/matches')}
            style={{
              background: '#6366f1',
              color: 'white',
              borderRadius: '24px',
              padding: '12px 28px',
              fontSize: '14px',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: '10px',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
            }}
          >
            Back to matches
          </button>
        </div>
      </div>
    )
  }

  const otherPhotoUrl = otherProfile?.photos && otherProfile.photos.length > 0
    ? otherProfile.photos[0]
    : '/placeholder.jpg'

  return (
    <div style={{
      position: 'relative',
      height: '100vh',
      background: '#000000',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: 'Inter, sans-serif'
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
        background: 'rgba(0,0,0,0.8)',
        zIndex: 10,
        pointerEvents: 'none'
      }} />

      {/* Red Safety Warning Toast Alert */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#ef4444',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '30px',
          zIndex: 100,
          boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
          fontSize: '13px',
          fontWeight: 600,
          animation: 'fadeIn 0.25s ease-out',
          textAlign: 'center',
          width: '90%',
          maxWidth: '350px'
        }}>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes fadeIn {
              from { opacity: 0; transform: translate(-50%, -10px); }
              to { opacity: 1; transform: translate(-50%, 0); }
            }
          ` }} />
          {toastMessage}
        </div>
      )}

      {/* Top Bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        width: '100%',
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 30,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <ArrowLeft
          size={24}
          color="#ffffff"
          style={{ cursor: 'pointer' }}
          onClick={() => router.push('/matches')}
        />
        <img
          src={otherPhotoUrl}
          alt={otherProfile?.name || 'Partner'}
          onClick={() => setShowProfile(true)}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            objectFit: 'cover',
            cursor: 'pointer'
          }}
        />
        <div
          onClick={() => setShowProfile(true)}
          style={{
            color: 'white',
            fontSize: '16px',
            fontWeight: 600,
            flex: 1,
            cursor: 'pointer'
          }}
        >
          {otherProfile?.name}
        </div>
        {timeRemaining && (
          <div style={{
            fontSize: '12px',
            color: '#ff9f43',
            fontWeight: 600,
            background: 'rgba(255, 159, 67, 0.1)',
            padding: '4px 10px',
            borderRadius: '12px'
          }}>
            {timeRemaining}
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '80px 16px 100px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        position: 'relative',
        zIndex: 20
      }}>
        {messages.length > 0 ? (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUser?.id
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                  alignItems: isMe ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{
                  background: isMe ? '#6366f1' : 'rgba(255,255,255,0.1)',
                  color: 'white',
                  borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  padding: '10px 14px',
                  fontSize: '14px',
                  lineHeight: 1.4,
                  wordBreak: 'break-word'
                }}>
                  {msg.content}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.4)',
                  marginTop: '3px',
                  padding: '0 4px'
                }}>
                  {formatTime(msg.created_at)}
                </div>
              </div>
            )
          })
        ) : (
          /* Empty State */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            flex: 1,
            gap: '12px',
            textAlign: 'center',
            padding: '40px 0'
          }}>
            <Heart size={40} color="#6366f1" fill="#6366f1" />
            <div style={{ fontSize: '16px', fontWeight: 500, color: 'white' }}>
              You matched! Say hello 👋
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        width: '100%',
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 30,
        padding: '12px 16px',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend()
          }}
          placeholder="Type a message..."
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '24px',
            padding: '12px 16px',
            color: 'white',
            fontSize: '14px',
            outline: 'none',
            transition: 'border-color 0.2s'
          }}
          onFocus={(e) => e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)'}
          onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
        />
        <button
          onClick={handleSend}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: '#6366f1',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'background-color 0.2s, transform 0.1s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6366f1'}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Send size={18} color="white" />
        </button>
      </div>
      

      {/* Full profile overlay */}
      {showProfile && otherProfile && (
        <div style={{position:'fixed',inset:0,zIndex:999,background:'#0a0a0a',overflowY:'auto',fontFamily:'Inter,sans-serif'}}>
          
          {/* Close button */}
          <div style={{position:'fixed',top:16,right:16,zIndex:1000,display:'flex',gap:8}}>
            <button 
              onClick={() => setShowReport(true)}
              style={{width:40,height:40,borderRadius:'50%',background:'rgba(0,0,0,0.6)',backdropFilter:'blur(10px)',border:'1px solid rgba(255,255,255,0.15)',color:'white',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}
            >🚩</button>
            <button 
              onClick={() => { setShowProfile(false); setPhotoIndex(0); }}
              style={{width:40,height:40,borderRadius:'50%',background:'rgba(0,0,0,0.6)',backdropFilter:'blur(10px)',border:'1px solid rgba(255,255,255,0.15)',color:'white',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}
            >✕</button>
          </div>

          {/* HERO PHOTO - full width, tall */}
          <div style={{width:'100%',height:'65vh',position:'relative',overflow:'hidden'}}>
            <img 
              src={otherProfile.photos && otherProfile.photos[photoIndex] ? otherProfile.photos[photoIndex] : '/placeholder.jpg'} 
              alt={otherProfile.name}
              style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center top'}} 
            />
            {/* Bottom gradient */}
            <div style={{position:'absolute',bottom:0,left:0,right:0,height:'50%',background:'linear-gradient(transparent,#0a0a0a)'}} />
            
            {/* Name overlay on photo */}
            <div style={{position:'absolute',bottom:20,left:20,right:20}}>
              <div style={{fontSize:28,fontWeight:700,color:'white',textShadow:'0 2px 8px rgba(0,0,0,0.8)'}}>
                {otherProfile.name}, {new Date().getFullYear() - new Date(otherProfile.birthdate).getFullYear()}
              </div>
              <div style={{fontSize:14,color:'rgba(255,255,255,0.7)',marginTop:4}}>{otherProfile.gender}</div>
            </div>

            {/* Photo navigation dots */}
            {otherProfile.photos && otherProfile.photos.length > 1 && (
              <div style={{position:'absolute',top:12,left:12,right:12,display:'flex',gap:4}}>
                {otherProfile.photos.map((_,i) => (
                  <div key={i} onClick={() => setPhotoIndex(i)} style={{flex:1,height:3,borderRadius:2,background:i===photoIndex?'white':'rgba(255,255,255,0.35)',cursor:'pointer',transition:'background 0.2s'}} />
                ))}
              </div>
            )}

            {/* Left/Right tap zones */}
            {photoIndex > 0 && (
              <div onClick={() => setPhotoIndex(p=>p-1)} style={{position:'absolute',left:0,top:0,bottom:0,width:'40%',cursor:'pointer'}} />
            )}
            {otherProfile.photos && photoIndex < otherProfile.photos.length-1 && (
              <div onClick={() => setPhotoIndex(p=>p+1)} style={{position:'absolute',right:0,top:0,bottom:0,width:'40%',cursor:'pointer'}} />
            )}
          </div>

          {/* ABOUT SECTION */}
          {otherProfile.bio && (
            <div style={{margin:'16px 16px 0',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:16,padding:16}}>
              <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:8,letterSpacing:'0.05em',textTransform:'uppercase'}}>About</div>
              <div style={{fontSize:15,color:'rgba(255,255,255,0.85)',lineHeight:1.6}}>{otherProfile.bio}</div>
            </div>
          )}

          {/* ALL PHOTOS GRID */}
          {otherProfile.photos && otherProfile.photos.length > 1 && (
            <div style={{margin:'12px 16px 0',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:16,padding:16}}>
              <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:12,letterSpacing:'0.05em',textTransform:'uppercase'}}>Photos</div>
              <div style={{display:'flex',gap:8}}>
                {otherProfile.photos.slice(0,3).map((photo,i) => (
                  <img key={i} src={photo} onClick={() => setPhotoIndex(i)} alt={`photo ${i+1}`} style={{flex:1,height:110,objectFit:'cover',objectPosition:'center top',borderRadius:10,cursor:'pointer',border:i===photoIndex?'2px solid white':'2px solid transparent',transition:'border 0.2s'}} />
                ))}
              </div>
            </div>
          )}

          {/* BOTTOM PADDING */}
          <div style={{height:32}} />

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
                        if (!reportReason || !currentUser || !otherProfile) return
                        await supabase.from('reports').insert({
                          reported_by: currentUser.id,
                          reported_user: otherProfile.id,
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
                        onClick={() => { setShowReport(false); setShowProfile(false); setReportReason(null); setReportSubmitted(false); router.push('/matches'); }}
                        style={{padding:'12px 28px',borderRadius:30,background:'#ef4444',color:'white',fontSize:14,fontWeight:600,border:'none',cursor:'pointer'}}
                      >Back to matches</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

        </div>
      )}

      <BottomNav />
    </div>
  )
}
