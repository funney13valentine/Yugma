'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Shield, Lock, EyeOff, UserX } from 'lucide-react';
import LineWaves from '@/components/LineWaves';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();
  const [animated, setAnimated] = useState(false);
  const cardRef = useRef(null);

  // Check if user is already logged in and redirect to dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/dashboard');
      }
    });
  }, [router]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimated(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="w-full bg-[#000000] min-h-screen" style={{ margin: 0, padding: 0, border: 'none' }}>
      {/* 1. LineWaves Background (Fixed for full page) */}
      <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
        <LineWaves
          color1="#ffffff"
          color2="#ffffff"
          color3="#ffffff"
          brightness={0.18}
          speed={0.25}
          warpIntensity={1.2}
          rotation={-45}
          enableMouseInteraction={true}
        />
      </div>

      {/* 2. Dark Overlay (Fixed for full page) */}
      <div className="fixed inset-0 bg-[#000000]/55 z-10 pointer-events-none" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }} />

      {/* SECTION 1 — HERO (full 100vh) */}
      <div className="relative w-full h-[100vh] overflow-hidden bg-transparent z-20" style={{ margin: 0, padding: 0, border: 'none' }}>
        {/* 3. Center content */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 20,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          {/* युग्म plain text */}
          <h1
            style={{
              fontFamily: 'var(--font-noto-serif-devanagari), Noto Serif Devanagari, serif',
              fontSize: 'clamp(72px, 15vw, 140px)',
              fontWeight: 700,
              color: 'white',
              lineHeight: 1.1,
              background: 'linear-gradient(135deg, #e8e8e8 0%, #ffffff 25%, #a0a0a0 50%, #ffffff 75%, #c8c8c8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            युग्म
          </h1>

          {/* "YUGMA" below it */}
          <div
            style={{
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.4)',
              letterSpacing: '0.35em',
              marginTop: '16px',
            }}
          >
            YUGMA
          </div>

          {/* ChevronDown below that */}
          <div style={{ marginTop: '24px' }}>
            <ChevronDown
              size={24}
              color="rgba(255, 255, 255, 0.3)"
              style={{
                color: 'rgba(255, 255, 255, 0.3)',
                animation: 'bounce 2s infinite',
              }}
            />
          </div>
        </div>
      </div>

      {/* SECTION 2 — TRUST SECTION */}
      <section
        style={{
          background: 'transparent',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          margin: 0,
          border: 'none',
          position: 'relative',
          zIndex: 20,
        }}
      >
        <div
          ref={cardRef}
          style={{
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '24px',
            padding: '48px 32px',
            maxWidth: '460px',
            width: '90%',
          }}
        >
          {/* Small label at top */}
          <div
            style={{
              fontSize: '11px',
              letterSpacing: '0.2em',
              color: 'rgba(255, 255, 255, 0.4)',
              textAlign: 'center',
              marginBottom: '36px',
              fontWeight: 700,
            }}
          >
            BEFORE YOU BEGIN
          </div>

          {/* 4 Trust Points */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* Point 1 */}
            <div
              style={{
                display: 'flex',
                gap: '16px',
                alignItems: 'flex-start',
                opacity: animated ? 1 : 0,
                transform: animated ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 0.5s ease, transform 0.5s ease',
                transitionDelay: '0ms',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Shield size={18} color="rgba(255, 255, 255, 0.7)" />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'white', margin: 0 }}>
                  PPSU students only
                </h3>
                <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px', lineHeight: 1.6, margin: '4px 0 0 0' }}>
                  Every account verified with your official college email. No outsiders, ever.
                </p>
              </div>
            </div>

            {/* Point 2 */}
            <div
              style={{
                display: 'flex',
                gap: '16px',
                alignItems: 'flex-start',
                opacity: animated ? 1 : 0,
                transform: animated ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 0.5s ease, transform 0.5s ease',
                transitionDelay: '150ms',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Lock size={18} color="rgba(255, 255, 255, 0.7)" />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'white', margin: 0 }}>
                  Your photos stay private
                </h3>
                <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px', lineHeight: 1.6, margin: '4px 0 0 0' }}>
                  Profiles are only visible to verified students. Nobody else.
                </p>
              </div>
            </div>

            {/* Point 3 */}
            <div
              style={{
                display: 'flex',
                gap: '16px',
                alignItems: 'flex-start',
                opacity: animated ? 1 : 0,
                transform: animated ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 0.5s ease, transform 0.5s ease',
                transitionDelay: '300ms',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <EyeOff size={18} color="rgba(255, 255, 255, 0.7)" />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'white', margin: 0 }}>
                  We don&apos;t sell your data
                </h3>
                <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px', lineHeight: 1.6, margin: '4px 0 0 0' }}>
                  No ads, no third parties. Your information never leaves this app.
                </p>
              </div>
            </div>

            {/* Point 4 */}
            <div
              style={{
                display: 'flex',
                gap: '16px',
                alignItems: 'flex-start',
                opacity: animated ? 1 : 0,
                transform: animated ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 0.5s ease, transform 0.5s ease',
                transitionDelay: '450ms',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <UserX size={18} color="rgba(255, 255, 255, 0.7)" />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'white', margin: 0 }}>
                  You&apos;re in control
                </h3>
                <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px', lineHeight: 1.6, margin: '4px 0 0 0' }}>
                  Unmatch, report, or delete your account anytime. Instantly.
                </p>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div
            style={{
              marginTop: '36px',
              fontSize: '11px',
              color: 'rgba(255, 255, 255, 0.25)',
              textAlign: 'center',
              lineHeight: '1.7',
            }}
          >
            This is an unofficial app for PPSU students only. We are not affiliated with PP Savani University.
          </div>

          {/* Buttons */}
          <div
            style={{
              marginTop: '28px',
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
            }}
          >
            <button
              onClick={() => router.push('/auth/signup')}
              style={{
                background: '#ffffff',
                color: '#000000',
                borderRadius: '30px',
                padding: '13px 24px',
                fontSize: '14px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              I understand, let&apos;s go →
            </button>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: 'rgba(255, 255, 255, 0.6)',
                borderRadius: '30px',
                padding: '13px 24px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              No thanks
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
