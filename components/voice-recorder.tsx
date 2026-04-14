"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2, Trash2, Check, AlertCircle, Play, Pause } from "lucide-react";

type RecorderState = "idle" | "recording" | "preview" | "transcribing" | "denied" | "error";

const MIN_RECORDING_MS = 1000;
const TOOLTIP_KEY = "voice-recorder-tooltip-seen";

interface Props {
  /** Called with the transcribed text once the user confirms the recording. */
  onTranscribed: (text: string) => void;
  /** Optional: called when the user starts recording (e.g. to clear errors upstream). */
  onRecordStart?: () => void;
  disabled?: boolean;
}

/**
 * Records audio via MediaRecorder, sends to /api/transcribe, then hands the
 * transcript back via onTranscribed. Renders nothing if the browser doesn't
 * support MediaRecorder (parent should detect this separately if it wants
 * to show a fallback message).
 */
export function VoiceRecorder({ onTranscribed, onRecordStart, disabled }: Props) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [state, setState] = useState<RecorderState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [showTip, setShowTip] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startTimeRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  // Detect MediaRecorder support on mount
  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      typeof window.MediaRecorder !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia;
    setSupported(ok);

    if (ok) {
      try {
        const seen = localStorage.getItem(TOOLTIP_KEY);
        if (!seen) setShowTip(true);
      } catch {
        /* ignore */
      }
    }
  }, []);

  /* ---------- cleanup on unmount or page hide ---------- */
  const fullCleanup = useCallback(() => {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      fullCleanup();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [fullCleanup, audioUrl]);

  // Warn before navigating away while recording
  useEffect(() => {
    if (state !== "recording") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [state]);

  function dismissTooltip() {
    setShowTip(false);
    try {
      localStorage.setItem(TOOLTIP_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  async function startRecording() {
    setErrorMsg(null);
    onRecordStart?.();
    dismissTooltip();

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const elapsed = Date.now() - startTimeRef.current;
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });

        // Stop the mic stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        if (tickRef.current !== null) {
          window.clearInterval(tickRef.current);
          tickRef.current = null;
        }

        if (elapsed < MIN_RECORDING_MS) {
          setErrorMsg("Recording was too short. Try holding for at least a second.");
          setState("idle");
          setElapsedMs(0);
          return;
        }

        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setState("preview");
      };

      startTimeRef.current = Date.now();
      recorder.start();
      setState("recording");
      setElapsedMs(0);
      tickRef.current = window.setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current);
      }, 100);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const denied = /permission|denied|notallowed/i.test(msg) || (err as DOMException)?.name === "NotAllowedError";
      if (denied) {
        setState("denied");
      } else {
        setErrorMsg(msg);
        setState("error");
      }
      // Make sure we release any partial stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    }
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }

  function discardRecording() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setElapsedMs(0);
    setState("idle");
  }

  async function confirmRecording() {
    if (!audioBlob) return;
    setState("transcribing");
    setErrorMsg(null);

    const fd = new FormData();
    // Whisper infers format from extension; .webm is fine.
    fd.append("audio", new File([audioBlob], "answer.webm", { type: audioBlob.type || "audio/webm" }));

    try {
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transcription failed");
      onTranscribed(data.text || "");
      // Reset to idle after handing off the text
      discardRecording();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Transcription failed");
      setState("preview");
    }
  }

  function togglePlayback() {
    const el = audioElRef.current;
    if (!el) return;
    if (el.paused) {
      el.play();
      setIsPlaying(true);
    } else {
      el.pause();
      setIsPlaying(false);
    }
  }

  /* ----------------------- render ----------------------- */

  if (supported === null) return null; // pre-hydration
  if (!supported) {
    return (
      <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
        Voice input not supported in this browser. Use Chrome, Edge, or Safari.
      </p>
    );
  }

  if (state === "denied") {
    return (
      <div className="rounded-2xl border-2 border-gloss-yellow/50 bg-gloss-yellow/10 p-4 text-sm text-zinc-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="size-5 text-gloss-yellow mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-gloss-yellow uppercase text-[11px] tracking-[0.14em]">Microphone blocked</p>
            <p className="mt-1 text-zinc-300 leading-relaxed">
              Click the lock/site-info icon in your address bar, set <strong>Microphone</strong> to <em>Allow</em>,
              then refresh the page.
            </p>
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setState("idle");
              }}
              className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-gloss-yellow hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state === "recording") {
    return (
      <div className="flex items-center gap-4 rounded-chunk border-2 border-gloss-pink/60 bg-gloss-pink/10 p-4">
        <span className="relative flex size-4 flex-shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gloss-pink opacity-75" />
          <span className="relative inline-flex size-4 rounded-full bg-gloss-pink" />
        </span>
        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gloss-pink">Recording</p>
          <p className="font-mono text-2xl text-white tabular-nums">{formatTime(elapsedMs)}</p>
        </div>
        <button
          type="button"
          onClick={stopRecording}
          className="btn-pink !py-3 !px-5 min-h-[48px]"
          aria-label="Stop recording"
        >
          <Square className="size-4 fill-white" /> STOP
        </button>
      </div>
    );
  }

  if (state === "preview" && audioUrl) {
    return (
      <div className="space-y-3 rounded-chunk border-2 border-gloss-cyan/40 bg-gloss-cyan/5 p-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlayback}
            className="btn-cyan !py-3 !px-4 min-h-[48px] min-w-[48px]"
            aria-label={isPlaying ? "Pause playback" : "Play recording"}
          >
            {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 fill-current" />}
          </button>
          <audio
            ref={audioElRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            controls
            className="flex-1 h-10"
          />
        </div>
        {errorMsg && (
          <p className="text-xs text-gloss-pink">{errorMsg}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={confirmRecording} className="btn-primary !py-3 min-h-[48px] flex-1" disabled={disabled}>
            <Check className="size-4" /> USE THIS RECORDING
          </button>
          <button type="button" onClick={discardRecording} className="btn-ghost !py-3 min-h-[48px]">
            <Trash2 className="size-4" /> RE-RECORD
          </button>
        </div>
      </div>
    );
  }

  if (state === "transcribing") {
    return (
      <div className="flex items-center gap-3 rounded-chunk border-2 border-gloss-purple/40 bg-gloss-purple/10 p-4 text-sm text-zinc-200">
        <Loader2 className="size-5 animate-spin text-gloss-purple" />
        <p className="font-bold uppercase tracking-[0.14em] text-[11px] text-gloss-purple">
          Transcribing your answer...
        </p>
      </div>
    );
  }

  // idle (or error)
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={startRecording}
          disabled={disabled}
          className="btn-pink !py-3 !px-5 min-h-[48px]"
          aria-label="Start recording answer"
        >
          <Mic className="size-4" /> RECORD ANSWER
        </button>
        {showTip && (
          <span className="badge-cyan animate-pulse">↑ ANSWER BY VOICE</span>
        )}
      </div>
      {errorMsg && state === "error" && (
        <p className="text-xs text-gloss-pink">{errorMsg}</p>
      )}
      {errorMsg && state === "idle" && (
        <p className="text-xs text-gloss-yellow">{errorMsg}</p>
      )}
    </div>
  );
}

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
