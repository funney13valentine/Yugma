'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Heart, Send } from 'lucide-react'
import LineWaves from '@/components/LineWaves'
import supabase from '@/lib/supabase'

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
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            objectFit: 'cover'
          }}
        />
        <div style={{
          color: 'white',
          fontSize: '16px',
          fontWeight: 600,
          flex: 1
        }}>
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
    </div>
  )
}
