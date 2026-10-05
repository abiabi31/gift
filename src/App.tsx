import { AnimatePresence, motion } from 'framer-motion'
import { gsap } from 'gsap'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { CakeStage } from './components/CakeScene'
import { birthdayConfig } from './config/birthday'
import './App.css'

const CakeScene = lazy(() => import('./components/CakeScene'))
const AmbientCelebrationBackground = lazy(() =>
  import('./components/CakeScene').then((module) => ({
    default: module.AmbientCelebrationBackground,
  })),
)

const pages = [
  { id: 'intro', label: 'Birthday' },
  { id: 'cake', label: 'Cake' },
  { id: 'memories', label: 'Memories' },
  { id: 'final', label: 'Final' },
] as const

type PageId = (typeof pages)[number]['id']
type IntroPhase = 'countdown' | 'clock' | 'celebration'

const galleryImages = [
  { src: '/images/birthday-1.jpg', alt: 'A birthday celebration filled with lights' },
  { src: '/images/birthday-3.jpg', alt: 'A beautiful rose-colored birthday memory' },
  { src: '/images/birthday-5.jpg', alt: 'A joyful celebration with friends' },
]

function App() {
  const audioContextRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const clockAuraRef = useRef<HTMLSpanElement | null>(null)
  const stageTimers = useRef<number[]>([])
  const [currentPage, setCurrentPage] = useState<PageId>('intro')
  const [unlockedPage, setUnlockedPage] = useState(0)
  const [introPhase, setIntroPhase] = useState<IntroPhase>('countdown')
  const [countdown, setCountdown] = useState(5)
  const [giftOpening, setGiftOpening] = useState(false)
  const [cakeStage, setCakeStage] = useState<CakeStage>('idle')
  const cakeStageRef = useRef<CakeStage>('idle')
  const [musicOn, setMusicOn] = useState(true)
  const [songStarted, setSongStarted] = useState(false)
  const [songError, setSongError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [finalRevealed, setFinalRevealed] = useState(false)
  const [finalBurst, setFinalBurst] = useState(0)

  const currentIndex = pages.findIndex((page) => page.id === currentPage)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (introPhase === 'countdown') {
        if (countdown > 0) {
          setCountdown((value) => value - 1)
        } else {
          setIntroPhase('clock')
        }
      } else if (introPhase === 'clock') {
        setIntroPhase('celebration')
      }
    }, introPhase === 'clock' ? 5000 : 1200)

    return () => window.clearTimeout(timer)
  }, [countdown, introPhase])

  useEffect(() => {
    const aura = clockAuraRef.current
    if (introPhase !== 'clock' || !aura) return

    const timeline = gsap.timeline()
    timeline.to(aura, { scale: 1.1, opacity: 0.82, duration: 5, ease: 'sine.inOut' })
    return () => {
      timeline.kill()
    }
  }, [introPhase])

  useEffect(() => {
    if (masterGainRef.current && audioContextRef.current) {
      masterGainRef.current.gain.setTargetAtTime(
        musicOn ? 0.22 : 0,
        audioContextRef.current.currentTime,
        0.18,
      )
    }
  }, [musicOn])

  useEffect(
    () => () => {
      stageTimers.current.forEach((timer) => window.clearTimeout(timer))
      void audioContextRef.current?.close()
    },
    [],
  )

  const navigateTo = (index: number) => {
    if (index < 0 || index > unlockedPage || index === currentIndex) return
    setCurrentPage(pages[index].id)
    setSelectedImage(null)
  }

  const continueTo = (index: number) => {
    if (index !== currentIndex + 1) return
    setUnlockedPage((unlocked) => Math.max(unlocked, index))
    setCurrentPage(pages[index].id)
  }

  const toggleMusic = () => setMusicOn((enabled) => !enabled)

  const transitionCakeStage = (nextStage: CakeStage) => {
    cakeStageRef.current = nextStage
    setCakeStage(nextStage)
  }

  const playBirthdaySong = async () => {
    try {
      setSongError(null)
      const context = audioContextRef.current ?? new AudioContext()
      audioContextRef.current = context
      if (!masterGainRef.current) {
        masterGainRef.current = context.createGain()
        masterGainRef.current.gain.value = 0
        masterGainRef.current.connect(context.destination)
      }

      await context.resume()
      masterGainRef.current.gain.setTargetAtTime(musicOn ? 0.22 : 0, context.currentTime, 0.18)
      setSongStarted(true)

      const melody = [
        [392, 0.28], [392, 0.28], [440, 0.56], [392, 0.56], [523.25, 0.56], [493.88, 0.9],
        [392, 0.28], [392, 0.28], [440, 0.56], [392, 0.56], [587.33, 0.56], [523.25, 0.9],
        [392, 0.28], [392, 0.28], [783.99, 0.56], [659.25, 0.56], [523.25, 0.56], [493.88, 0.56], [440, 0.9],
        [698.46, 0.28], [698.46, 0.28], [659.25, 0.56], [523.25, 0.56], [587.33, 0.56], [523.25, 1.1],
      ] as const
      let startAt = context.currentTime + 0.12

      for (const [frequency, duration] of melody) {
        const oscillator = context.createOscillator()
        const envelope = context.createGain()
        oscillator.type = 'sine'
        oscillator.frequency.value = frequency
        envelope.gain.setValueAtTime(0.0001, startAt)
        envelope.gain.exponentialRampToValueAtTime(0.16, startAt + 0.035)
        envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration * 0.92)
        oscillator.connect(envelope)
        envelope.connect(masterGainRef.current)
        oscillator.start(startAt)
        oscillator.stop(startAt + duration)
        startAt += duration
      }
      stageTimers.current.push(
        window.setTimeout(() => setSongStarted(false), (startAt - context.currentTime) * 1000),
      )
    } catch (error) {
      console.error('The birthday melody could not be played.', error)
      setSongError('The birthday melody could not play in this browser.')
    }
  }

  const blowCandles = () => {
    if (cakeStageRef.current !== 'idle') return
    transitionCakeStage('blowing')
    stageTimers.current.push(
      window.setTimeout(() => transitionCakeStage('extinguished'), 1400),
      window.setTimeout(() => transitionCakeStage('readyToCut'), 2550),
    )
  }

  const cutCake = () => {
    if (cakeStageRef.current !== 'readyToCut') return
    try {
      const context = audioContextRef.current ?? new AudioContext()
      audioContextRef.current = context
      if (!masterGainRef.current) {
        masterGainRef.current = context.createGain()
        masterGainRef.current.gain.value = 0
        masterGainRef.current.connect(context.destination)
      }
      void context.resume().catch((error: unknown) => {
        console.error('The birthday song audio context could not resume.', error)
        setSongError('The birthday melody could not play in this browser.')
      })
    } catch (error) {
      console.error('The birthday song audio could not be prepared.', error)
      setSongError('The birthday melody could not play in this browser.')
    }
    transitionCakeStage('cutting')
    stageTimers.current.push(
      window.setTimeout(() => {
        transitionCakeStage('celebration')
        void playBirthdaySong()
      }, 3300),
    )
  }

  const openFinalMessage = () => {
    setFinalRevealed(true)
    setFinalBurst((burst) => burst + 1)
  }

  const openGift = () => {
    if (giftOpening) return
    setGiftOpening(true)
    stageTimers.current.push(
      window.setTimeout(() => {
        setUnlockedPage((unlocked) => Math.max(unlocked, 1))
        setCurrentPage('cake')
        setGiftOpening(false)
      }, 1050),
    )
  }

  return (
    <div className={`page-shell page-${currentPage}`}>
      <div className="ambient-layer" aria-hidden="true">
        {(currentPage !== 'intro' || introPhase === 'celebration') && (
          <Suspense fallback={null}>
            <AmbientCelebrationBackground showCakes={currentPage === 'cake' || currentPage === 'memories'} />
          </Suspense>
        )}
      </div>

      <AnimatePresence>
        {(currentPage !== 'intro' || introPhase === 'celebration') && (
          <motion.header
            className="app-chrome"
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.35 }}
          >
        <div className="brand-mark" aria-hidden="true">✦</div>
        <nav className="page-menu" aria-label="Birthday story progress">
          {pages.map((page, index) => {
            const unlocked = index <= unlockedPage
            return (
              <button
                key={page.id}
                type="button"
                className={`page-menu-item ${currentIndex === index ? 'active' : ''} ${unlocked ? 'unlocked' : 'locked'}`}
                onClick={() => navigateTo(index)}
                disabled={!unlocked}
                aria-current={currentIndex === index ? 'step' : undefined}
                aria-label={`${page.label}, ${unlocked ? 'unlocked' : 'locked'}`}
                title={unlocked ? page.label : `${page.label} is locked`}
              >
                <span className="page-menu-number">{unlocked ? index + 1 : '·'}</span>
                <span className="page-menu-label">{page.label}</span>
              </button>
            )
          })}
        </nav>
        <button
          type="button"
          className="music-toggle"
          onClick={toggleMusic}
          aria-pressed={musicOn}
          aria-label={musicOn ? 'Mute birthday music' : 'Enable birthday music'}
        >
          {musicOn ? (songStarted ? '♫ ON' : '♫ READY') : '♫ OFF'}
        </button>
          </motion.header>
        )}
      </AnimatePresence>

      <AnimatePresence mode="sync">
        <motion.main
          key={currentPage}
          className={`story-page story-page-${currentPage}`}
          initial={{ opacity: 0, scale: 0.96, filter: 'blur(12px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 1.03, filter: 'blur(14px)' }}
          transition={{ duration: 0.48, ease: [0.22, 0.61, 0.36, 1] }}
        >
          {currentPage === 'intro' && (
            <section className="intro-page-content">
              <div className="hero-overlay" />
              <AnimatePresence mode="wait">
                {introPhase === 'countdown' && (
                  <motion.div
                    key={`count-${countdown}`}
                    className="countdown-stage"
                    initial={{ opacity: 0, scale: 0.82, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, scale: 1.04, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 1.16, filter: 'blur(10px)' }}
                    transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                    aria-live="assertive"
                  >
                    <span className="countdown-number">{String(countdown).padStart(2, '0')}</span>
                  </motion.div>
                )}
                {introPhase === 'clock' && (
                  <motion.div
                    key="birthday-clock"
                    className="birthday-clock-stage"
                    initial={{ opacity: 0, scale: 0.65, filter: 'blur(16px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 1.25, filter: 'blur(12px)' }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    aria-live="assertive"
                  >
                    <span className="clock-light-rays" />
                    <span className="clock-aura" ref={clockAuraRef} />
                    <span className="clock-particles" aria-hidden="true">
                      {Array.from({ length: 12 }, (_, index) => (
                        <i key={index} style={{ '--particle-index': index } as React.CSSProperties} />
                      ))}
                    </span>
                    <span className="clock-label">The birthday moment</span>
                    <span className="clock-time">12:00</span>
                    <span className="clock-caption">A new year of wonder begins</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {introPhase === 'celebration' && (
                <motion.div
                  className="intro-card"
                  initial={{ opacity: 0, y: 32, scale: 0.96, filter: 'blur(14px)' }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                  transition={{ duration: 0.85, ease: [0.22, 0.61, 0.36, 1] }}
                >
                  <motion.p
                    className="eyebrow"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18, duration: 0.55 }}
                  >
                    🎉 Happy Birthday
                  </motion.p>
                  <motion.h1
                    initial={{ opacity: 0, y: 18, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.48, duration: 0.7 }}
                  >
                    Happy Birthday<span>{birthdayConfig.name} ✨</span>
                  </motion.h1>
                  <motion.p
                    className="celebration-caption"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.82, duration: 0.55 }}
                  >
                    A little celebration, made just for you
                  </motion.p>
                  <motion.p
                    className="hero-copy"
                    initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ delay: 1.12, duration: 0.65 }}
                  >
                    May today bring a thousand reasons to smile, and may the year ahead be as lovely as you are.
                  </motion.p>
                  <motion.button
                    type="button"
                    className={`story-button gift-button ${giftOpening ? 'gift-opening' : ''}`}
                    whileHover={giftOpening ? undefined : { scale: 1.045 }}
                    whileTap={giftOpening ? undefined : { scale: 0.96 }}
                    onClick={openGift}
                    disabled={giftOpening}
                    initial={{ opacity: 0, y: 22, scale: 0.82 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 1.48, duration: 0.7, type: 'spring', stiffness: 170, damping: 16 }}
                  >
                    <span className="gift-icon" aria-hidden="true">{giftOpening ? '🎊' : '🎁'}</span>
                    <span>{giftOpening ? 'Your surprise is opening...' : 'Open Your Surprise'}</span>
                    {giftOpening && (
                      <span className="gift-confetti" aria-hidden="true">
                        {['✨', '🎉', '🎊', '💖', '❤️', '✨', '🎉', '💖'].map((spark, index) => (
                          <i key={`${spark}-${index}`} style={{ '--particle': index } as React.CSSProperties}>
                            {spark}
                          </i>
                        ))}
                      </span>
                    )}
                  </motion.button>
                </motion.div>
              )}
              {introPhase === 'celebration' && (
                <div className="intro-decoration" aria-hidden="true">
                  <span>✦</span><span>✧</span><span>✧</span><span>✦</span>
                </div>
              )}
            </section>
          )}

          {currentPage === 'cake' && (
            <section className="cake-page-content">
              <div className="story-heading cake-heading">
                <p className="eyebrow">Your surprise is here</p>
                <h1>Make a Wish <span>✨</span></h1>
              </div>

              <div className={`cake-scene cake-scene-${cakeStage}`}>
                <Suspense fallback={<div className="scene-loading">Preparing your cake...</div>}>
                  <CakeScene stage={cakeStage} />
                </Suspense>
                <div className="scene-vignette" aria-hidden="true" />
              </div>

              <div className="cake-controls" aria-live="polite">
                {cakeStage === 'idle' && <p>Close your eyes and make a wish...</p>}
                {cakeStage === 'blowing' && <p className="blowing-copy">A little breath of magic... 💨</p>}
                {cakeStage === 'extinguished' && <p className="wish-granted">✨ Wish granted ✨</p>}
                {cakeStage === 'readyToCut' && (
                  <div className="cake-prompt">
                    <p className="wish-granted">✨ Perfect! ✨</p>
                    <p>Now cut the cake</p>
                  </div>
                )}
                {cakeStage === 'cutting' && <p>A little slice of celebration...</p>}
                {cakeStage === 'celebration' && (
                  <div className="cake-celebration-copy">
                    <p className="wish-granted">🎉 You cut the cake! 🎉</p>
                    <p className="song-title">♪ Happy Birthday to you, {birthdayConfig.name} ♪</p>
                    <div className={`song-visualizer ${musicOn ? 'is-playing' : ''}`} aria-hidden="true">
                      {Array.from({ length: 9 }, (_, index) => (
                        <span key={index} style={{ animationDelay: `${index * -0.13}s` }} />
                      ))}
                    </div>
                    {songError && <p className="song-error" role="alert">{songError}</p>}
                  </div>
                )}

                {cakeStage === 'idle' && (
                  <motion.button
                    type="button"
                    className="story-button secondary-button"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={blowCandles}
                  >
                    💨 Blow the Candles
                  </motion.button>
                )}
                {cakeStage === 'readyToCut' && (
                  <motion.button
                    type="button"
                    className="story-button secondary-button"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={cutCake}
                  >
                    Cut the Cake
                  </motion.button>
                )}
                {cakeStage === 'celebration' && (
                  <button
                    type="button"
                    className="song-toggle"
                    onClick={toggleMusic}
                    aria-pressed={musicOn}
                  >
                    {musicOn ? '♫ Birthday song playing' : '♫ Play birthday song'}
                  </button>
                )}
              </div>

              <div className="page-actions">
                <button type="button" className="back-button" onClick={() => navigateTo(0)}>
                  ← Back
                </button>
                <button
                  type="button"
                  className="story-button continue-button"
                  onClick={() => continueTo(2)}
                  disabled={cakeStage !== 'celebration'}
                >
                  Continue ✨
                </button>
              </div>
            </section>
          )}

          {currentPage === 'memories' && (
            <section className="memories-page-content">
              <div className="story-heading">
                <p className="eyebrow">Memories in bloom</p>
                <h1>Little moments, <span>big love</span></h1>
              </div>

              <div className="memory-grid">
                {galleryImages.map((image, index) => (
                  <motion.button
                    key={image.src}
                    type="button"
                    className={`memory-card memory-card-${index + 1}`}
                    onClick={() => setSelectedImage(image.src)}
                    whileHover={{ y: -6, scale: 1.015 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 + index * 0.1, duration: 0.5 }}
                  >
                    <img src={image.src} alt={image.alt} loading="lazy" />
                    <span>{['A day full of laughter', 'A little beauty in every day', 'Together is a lovely place'][index]}</span>
                  </motion.button>
                ))}
              </div>

              <p className="memory-message">
                Every moment is brighter with you in it. Here’s to all the lovely memories still to come. 💕
              </p>

              <div className="page-actions">
                <button type="button" className="back-button" onClick={() => navigateTo(1)}>
                  ← Back
                </button>
                <button
                  type="button"
                  className="story-button continue-button"
                  onClick={() => continueTo(3)}
                >
                  Continue 💕
                </button>
              </div>
            </section>
          )}

          {currentPage === 'final' && (
            <section className={`final-page-content ${finalRevealed ? 'final-revealed' : ''}`}>
              <div className="final-glow" />
              <div className="final-card">
                <div className="final-emblem" aria-hidden="true">✦</div>
                {!finalRevealed ? (
                  <>
                    <p className="eyebrow">One last little thing...</p>
                    <h1>Your final <span>surprise</span></h1>
                    <p className="final-lead">There’s one more message, just for you.</p>
                    <motion.button
                      type="button"
                      className="story-button"
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={openFinalMessage}
                    >
                      Final Surprise 💌
                    </motion.button>
                  </>
                ) : (
                  <motion.div
                    className="final-message"
                    initial={{ opacity: 0, y: 20, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.8 }}
                  >
                    <p className="eyebrow">For you, with all my love</p>
                    <h1>Happy Birthday<span>{birthdayConfig.name} ✨</span></h1>
                    <p>{birthdayConfig.message}</p>
                    <p className="final-wish">
                      May every dream you hold find its way to you, and may the year ahead be full of beautiful surprises.
                    </p>
                    <div className="final-signature">With lots of love... ✨</div>
                  </motion.div>
                )}
              </div>
              {finalRevealed && (
                <div className="final-burst-layer" key={finalBurst} aria-hidden="true">
                  {Array.from({ length: 32 }, (_, index) => (
                    <span
                      key={`${finalBurst}-${index}`}
                      className="final-burst-piece"
                      style={{
                        ['--angle' as string]: `${(360 / 32) * index}deg`,
                        ['--distance' as string]: `${70 + (index % 5) * 28}px`,
                        ['--color' as string]: index % 2 === 0 ? '#ffb6d9' : '#d4af37',
                      }}
                    />
                  ))}
                </div>
              )}
              <div className="page-actions">
                <button type="button" className="back-button" onClick={() => navigateTo(2)}>
                  ← Back
                </button>
              </div>
            </section>
          )}
        </motion.main>
      </AnimatePresence>

      <AnimatePresence>
        {selectedImage && currentPage === 'memories' && (
          <motion.div
            className="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
          >
            <div className="lightbox-content" onClick={(event) => event.stopPropagation()}>
              <button type="button" className="close-button" onClick={() => setSelectedImage(null)} aria-label="Close photo">
                ×
              </button>
              <img src={selectedImage} alt="Selected birthday memory" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
