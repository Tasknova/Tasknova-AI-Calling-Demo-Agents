'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Room,
  RoomEvent,
  createLocalAudioTrack,
  RemoteTrack,
  Track,
  ConnectionState,
  type RemoteParticipant,
  type TrackPublication,
} from 'livekit-client'
import {
  Mic,
  MicOff,
  PhoneOff,
  Loader2,
  AlertCircle,
  RefreshCw,
  Volume2,
  Radio,
} from 'lucide-react'

type SessionState =
  | 'idle'
  | 'requesting-token'
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'error'

interface Props {
  agentId: string
  agentName: string
  onEnd: () => void
}

export default function LivekitVoiceSession({ agentId, agentName, onEnd }: Props) {
  const roomRef = useRef<Room | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const localTrackRef = useRef<LocalAudioTrack | null>(null)

  const [sessionState, setSessionState] = useState<SessionState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [micGranted, setMicGranted] = useState<boolean | null>(null)
  const [agentSpeaking, setAgentSpeaking] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // --- Mute Toggle ---
  const toggleMute = useCallback(async () => {
    if (localTrackRef.current) {
      if (isMuted) {
        await localTrackRef.current.unmute()
        setIsMuted(false)
      } else {
        await localTrackRef.current.mute()
        setIsMuted(true)
      }
    }
  }, [isMuted])

  // --- Timer ---
  const startTimer = () => {
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
  }
  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  // --- Cleanup helper ---
  const cleanup = useCallback(async () => {
    stopTimer()
    
    // Ensure the audio element is detached
    if (audioRef.current) {
      audioRef.current.srcObject = null
    }

    if (roomRef.current) {
      try {
        // Stop all local tracks
        const localParticipant = roomRef.current.localParticipant
        if (localParticipant) {
          for (const pub of localParticipant.trackPublications.values()) {
            if (pub.track) {
              await localParticipant.unpublishTrack(pub.track)
              pub.track.stop()
            }
          }
        }
        await roomRef.current.disconnect()
      } catch (e) {
        console.warn('[LiveKit] Error during cleanup:', e)
      }
      roomRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  // --- Attach remote audio track (deduplicated) ---
  const attachAudioTrack = (track: RemoteTrack) => {
    const sid = track.sid
    if (sid && attachedSidsRef.current.has(sid)) {
      console.log('[LiveKit] Skipping duplicate audio track:', sid)
      return
    }
    if (sid) attachedSidsRef.current.add(sid)
    const el = track.attach()
    el.autoplay = true
    el.style.display = 'none'
    document.body.appendChild(el)
    audioElementsRef.current.push(el)
  }

  // --- Main start flow ---
  const startSession = useCallback(async (abortSignal: { aborted: boolean }) => {
    setErrorMessage(null)
    setElapsed(0)
    setAgentSpeaking(false)

    try {
      // Step 1 — Get token from our server proxy
      setSessionState('requesting-token')
      const tokenRes = await fetch('/api/demo/livekit-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId }),
      })
      
      if (abortSignal.aborted) return

      const tokenData = await tokenRes.json()
      if (!tokenRes.ok || !tokenData.token || !tokenData.livekit_host_url) {
        throw new Error(tokenData.error || 'Failed to start voice session. Please try again.')
      }

      // Step 2 — Normalise host to WSS
      let host: string = tokenData.livekit_host_url
      if (host.startsWith('https://')) host = host.replace('https://', 'wss://')
      if (host.startsWith('http://')) host = host.replace('http://', 'ws://')

      // Step 3 — Request and hold the microphone track immediately
      setSessionState('connecting')
      let audioTrack: LocalAudioTrack
      try {
        audioTrack = await createLocalAudioTrack({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        })
        setMicGranted(true)
      } catch {
        setMicGranted(false)
        throw new Error(
          'Microphone access was denied. Please allow microphone access in your browser settings and try again.'
        )
      }

      if (abortSignal.aborted) {
        audioTrack.stop()
        return
      }

      // Store a reference to the audio track so we can mute/unmute it dynamically
      const localTrack = audioTrack
      // Store it in a ref so the toggle function can access it
      localTrackRef.current = localTrack

      // Step 4 — Connect Room with strict noise cancellation
      const room = new Room({
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      roomRef.current = room

      // --- Debug Logging & Agent Speaking State ---
      room.on(RoomEvent.ActiveSpeakersChanged, async (speakers: RemoteParticipant[]) => {
        const isAgentTalking = speakers.some(p => p !== room.localParticipant)
        setAgentSpeaking(isAgentTalking)
      })

      room.on(RoomEvent.ParticipantConnected, (p) => console.log('[LiveKit] Agent joined:', p.identity))
      room.on(RoomEvent.ParticipantDisconnected, (p) => console.log('[LiveKit] Agent left:', p.identity))
      room.on(RoomEvent.TrackMuted, (pub) => console.log('[LiveKit] Track muted:', pub.trackSid))
      room.on(RoomEvent.TrackUnmuted, (pub) => console.log('[LiveKit] Track unmuted:', pub.trackSid))

      // Handle remote tracks (AI agent audio)
      room.on(
        RoomEvent.TrackSubscribed,
        (track: RemoteTrack, _pub: TrackPublication, participant: RemoteParticipant) => {
          console.log('[LiveKit] Track subscribed from:', participant.identity, track.sid)
          if (track.kind === Track.Kind.Audio) {
            if (audioRef.current) {
              track.attach(audioRef.current)
            }
            setAgentSpeaking(true)
          }
        }
      )

      room.on(
        RoomEvent.TrackUnsubscribed,
        (track: RemoteTrack, _pub: TrackPublication, participant: RemoteParticipant) => {
          console.log('[LiveKit] Track unsubscribed from:', participant.identity, track.sid)
          if (track.kind === Track.Kind.Audio) {
            if (audioRef.current) {
              track.detach(audioRef.current)
            }
          }
        }
      )

      room.on(RoomEvent.Disconnected, () => {
        cleanup()
        setSessionState('idle')
      })

      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        if (state === ConnectionState.Disconnected) {
          setSessionState('idle')
        }
      })

      await room.connect(host, tokenData.token)

      if (abortSignal.aborted) {
        room.disconnect()
        localTrack.stop()
        return
      }

      // Step 5 — Show Connected UI immediately
      setSessionState('connected')
      startTimer()

      // Step 6 — Publish the exact microphone track we acquired early
      await room.localParticipant.publishTrack(localTrack, {
        source: Track.Source.Microphone,
      })
    } catch (err) {
      if (abortSignal.aborted) return
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setErrorMessage(msg)
      setSessionState('error')
      await cleanup()
    }
  }, [agentId, cleanup])

  // Auto-start when component mounts
  useEffect(() => {
    const signal = { aborted: false }
    startSession(signal)
    
    return () => {
      signal.aborted = true
      cleanup()
    }
  }, [startSession, cleanup])

  // --- End conversation ---
  const handleEnd = async () => {
    setSessionState('disconnecting')
    await cleanup()
    onEnd()
  }

  // ==================== RENDER ====================

  if (sessionState === 'error') {
    return (
      <div className="flex flex-col items-center gap-6 py-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <div className="space-y-2 max-w-sm">
          <h3 className="text-lg font-bold text-gray-900">Connection Failed</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{errorMessage}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => startSession({ aborted: false })}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition text-sm shadow-sm"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
          <button
            onClick={onEnd}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-xl transition text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (sessionState === 'requesting-token' || sessionState === 'connecting') {
    const label =
      sessionState === 'requesting-token' ? 'Preparing session...' : 'Connecting to agent...'
    return (
      <div className="flex flex-col items-center gap-5 py-8 text-center">
        <div className="w-16 h-16 rounded-full bg-primary-50 border border-primary-100 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-gray-900">{label}</p>
          <p className="text-sm text-gray-500">This usually takes a few seconds...</p>
        </div>
      </div>
    )
  }

  if (sessionState === 'disconnecting') {
    return (
      <div className="flex flex-col items-center gap-5 py-8 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
        </div>
        <p className="font-semibold text-gray-700">Ending conversation...</p>
      </div>
    )
  }

  // Connected state
  return (
    <div className="flex flex-col items-center gap-6 py-4 text-center">
      {/* Status Indicator */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
        </span>
        <span className="text-sm font-semibold text-emerald-600">Connected</span>
      </div>

      {/* Agent Name */}
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Speaking with</p>
        <h3 className="text-2xl font-bold text-gray-900">{agentName}</h3>
      </div>

      {/* Speaking / Listening Animation */}
      <div
        className={`w-24 h-24 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${
          agentSpeaking
            ? 'border-blue-400 bg-blue-50 shadow-lg shadow-blue-200'
            : 'border-gray-200 bg-gray-50'
        }`}
      >
        {agentSpeaking ? (
          <Volume2 className="w-10 h-10 text-blue-500 animate-pulse" />
        ) : (
          <Radio className="w-10 h-10 text-gray-400" />
        )}
      </div>

      <p className="text-sm font-medium text-gray-600">
        {agentSpeaking ? '🔊 Agent Speaking...' : '🎙️ Listening...'}
      </p>

      {/* Timer */}
      <div className="font-mono text-3xl font-bold text-gray-800 tabular-nums">
        {formatTime(elapsed)}
      </div>

      {/* Mic status */}
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
          micGranted
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-600'
        }`}
      >
        {micGranted ? (
          <>
            <Mic className="w-3.5 h-3.5" /> Microphone Active
          </>
        ) : (
          <>
            <MicOff className="w-3.5 h-3.5" /> Microphone Inactive
          </>
        )}
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center justify-center gap-4">
        <button
          onClick={toggleMute}
          className={`inline-flex items-center gap-2 px-6 py-3 font-semibold rounded-xl transition shadow-md text-sm ${
            isMuted 
              ? 'bg-amber-500 hover:bg-amber-600 text-white' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
          }`}
        >
          {isMuted ? (
            <><MicOff className="w-4 h-4" /> Unmute</>
          ) : (
            <><Mic className="w-4 h-4" /> Mute Mic</>
          )}
        </button>

        <button
          onClick={handleEnd}
          className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition shadow-md text-sm"
        >
          <PhoneOff className="w-4 h-4" /> End Call
        </button>
      </div>

      {/* Hidden audio element for the agent's voice. Rendering this in React helps the browser's Acoustic Echo Cancellation (AEC). */}
      <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />
    </div>
  )
}
