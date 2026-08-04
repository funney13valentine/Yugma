'use client'

import { usePathname, useRouter } from 'next/navigation'
import { House, Heart, Plus, User } from 'lucide-react'

interface BottomNavProps {
  onPlusClick?: () => void
}

export default function BottomNav({ onPlusClick }: BottomNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  // Hide bottom navigation on chat room pages
  if (pathname && pathname.includes('/chat/')) {
    return null
  }

  // Active page helpers
  const isHome = pathname === '/dashboard'
  const isMatches = pathname === '/matches'
  const isProfile = pathname === '/profile/me'

  const activeColor = '#ffffff'
  const inactiveColor = 'rgba(255, 255, 255, 0.35)'

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      width: '100%',
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      padding: '8px 0',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      zIndex: 50,
      boxSizing: 'border-box'
    }}>
      {/* 1. Home Button */}
      <button
        onClick={() => router.push('/dashboard')}
        style={{
          background: 'none',
          border: 'none',
          outline: 'none',
          cursor: 'pointer',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color 0.2s'
        }}
      >
        <House size={24} color={isHome ? activeColor : inactiveColor} />
      </button>

      {/* 2. Matches Button */}
      <button
        onClick={() => router.push('/matches')}
        style={{
          background: 'none',
          border: 'none',
          outline: 'none',
          cursor: 'pointer',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color 0.2s'
        }}
      >
        <Heart size={24} color="#ef4444" fill={isMatches ? "#ef4444" : "none"} style={{ opacity: isMatches ? 1 : 0.55 }} />
      </button>

      {/* 3. Center + Button */}
      <button
        onClick={() => {
          if (onPlusClick) {
            onPlusClick()
          } else {
            router.push('/profile/me?upload=true')
          }
        }}
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: '#6366f1',
          border: 'none',
          outline: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
          transition: 'transform 0.2s, background-color 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)'
          e.currentTarget.style.backgroundColor = '#4f46e5'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.backgroundColor = '#6366f1'
        }}
      >
        <Plus size={28} color="#ffffff" />
      </button>

      {/* 4. Profile Button */}
      <button
        onClick={() => router.push('/profile/me')}
        style={{
          background: 'none',
          border: 'none',
          outline: 'none',
          cursor: 'pointer',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color 0.2s'
        }}
      >
        <User size={24} color={isProfile ? activeColor : inactiveColor} />
      </button>
    </div>
  )
}
