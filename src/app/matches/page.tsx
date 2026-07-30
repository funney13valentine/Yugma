'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Heart } from 'lucide-react'
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
  otherProfile: Profile
}

export default function MatchesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [matches, setMatches] = useState<Match[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    async function loadMatches() {
      try {
        setLoading(true)

        // 1. Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          router.push('/auth/signin')
          return
        }
        setCurrentUser(user)

        // 2. Fetch matches where user1 = user.id OR user2 = user.id
        const { data: matchesData, error: matchesError } = await supabase
          .from('matches')
          .select('*')
          .or(`user1.eq.${user.id},user2.eq.${user.id}`)

        if (matchesError) {
          console.error('Error fetching matches:', matchesError)
        }

        // 3. Filter out expired matches (expires_at < now())
        const now = Date.now()
        const activeMatches = (matchesData || []).filter(
          (m: any) => new Date(m.expires_at).getTime() > now
        )

        // 4. For each match, fetch the other person's profile
        const matchesWithProfiles = await Promise.all(
          activeMatches.map(async (match: any) => {
            const otherUserId = match.user1 === user.id ? match.user2 : match.user1
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', otherUserId)
              .single()

            if (profileError) {
              console.error(`Error fetching profile for ${otherUserId}:`, profileError)
              return null
            }
            return {
              ...match,
              otherProfile: profile
            } as Match
          })
        )

        // Filter out any matches where the other profile failed to fetch
        const validMatches = matchesWithProfiles.filter((m): m is Match => m !== null && !!m.otherProfile)
        setMatches(validMatches)
      } catch (err) {
        console.error('Error loading matches:', err)
      } finally {
        setLoading(false)
      }
    }

    loadMatches()
  }, [router])

  // Helper to compute expiration time text
  const getExpiryDetails = (expiresAtStr: string) => {
    const expiresAt = new Date(expiresAtStr).getTime()
    const now = Date.now()
    const diffMs = expiresAt - now
    if (diffMs <= 0) return { text: 'Expired', urgent: true }

    const totalMinutes = Math.floor(diffMs / (1000 * 60))
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    if (hours < 6) {
      return { text: `Expires in ${hours}h ${minutes}m`, urgent: true }
    }
    return { text: 'Active match', urgent: false }
  }

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      background: '#000000',
      display: 'flex',
      flexDirection: 'column',
      overflowX: 'hidden',
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
        background: 'rgba(0,0,0,0.65)',
        zIndex: 10,
        pointerEvents: 'none'
      }} />

      {/* Top Bar */}
      <div style={{
        position: 'relative',
        zIndex: 20,
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        minHeight: '56px'
      }}>
        <ArrowLeft
          size={24}
          color="#ffffff"
          style={{ cursor: 'pointer', zIndex: 22 }}
          onClick={() => router.push('/dashboard')}
        />
        <div style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '20px',
          fontWeight: 600,
          color: '#ffffff',
          zIndex: 21
        }}>
          Matches
        </div>
      </div>

      {/* Matches Content Area */}
      {loading ? (
        /* Loading Spinner */
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
      ) : matches.length > 0 ? (
        /* Matches List */
        <div style={{
          flex: 1,
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          position: 'relative',
          zIndex: 20,
          overflowY: 'auto'
        }}>
          {matches.map((match) => {
            const expiry = getExpiryDetails(match.expires_at)
            const photoUrl = match.otherProfile.photos && match.otherProfile.photos.length > 0
              ? match.otherProfile.photos[0]
              : '/placeholder.jpg'

            return (
              <div
                key={match.id}
                onClick={() => router.push('/chat/' + match.id)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  padding: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s, transform 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <img
                  src={photoUrl}
                  alt={match.otherProfile.name}
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: 'white' }}>
                    {match.otherProfile.name}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: expiry.urgent ? '#ff9f43' : 'rgba(255,255,255,0.4)',
                    fontWeight: expiry.urgent ? 500 : 400
                  }}>
                    {expiry.text}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Empty State */
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          flex: 1,
          padding: '40px 20px',
          textAlign: 'center',
          position: 'relative',
          zIndex: 20,
          gap: '12px'
        }}>
          <Heart size={48} color="rgba(255,255,255,0.2)" />
          <div style={{ fontSize: '18px', fontWeight: 500, color: 'white' }}>
            No matches yet
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
            Keep swiping
          </div>
        </div>
      )}
    </div>
  )
}
