import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Circle, Square } from 'lucide-react';

// ============================================================
// VoiceInput — Two mic modes for description fields
// 1. Speech-to-Text: Listens and auto-types text (Web Speech API)
// 2. Voice Record: Records audio clip and returns File
// ============================================================

interface VoiceInputProps {
  /** Called when speech-to-text produces text (appended) */
  onTextResult: (text: string) => void;
  /** Called when voice recording finishes with audio file */
  onAudioRecorded?: (file: File) => void;
  disabled?: boolean;
}

// Check browser support
const SpeechRecognition =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export default function VoiceInput({ onTextResult, onAudioRecorded, disabled }: VoiceInputProps) {
  // --- Speech-to-Text state ---
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // --- Voice Recording state ---
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ---- Speech-to-Text ----
  const toggleSpeechToText = useCallback(() => {
    if (!SpeechRecognition) {
      alert('Speech recognition not supported in this browser. Use Chrome.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN'; // Indian English (mechanics may speak Hindi/English mix)
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }
      if (transcript.trim()) {
        onTextResult(transcript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('[VoiceInput] Speech error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        alert('Microphone permission denied. Please allow mic access.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, onTextResult]);

  // ---- Voice Recording ----
  const startRecording = useCallback(async () => {
    if (!onAudioRecorded) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        const ext = mediaRecorder.mimeType.includes('webm') ? 'webm' : 'mp4';
        const file = new File([blob], `voice_note_${Date.now()}.${ext}`, { type: mediaRecorder.mimeType });
        onAudioRecorded(file);

        // Cleanup stream
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('[VoiceInput] Recording error:', err);
      alert('Could not access microphone. Please allow mic access.');
    }
  }, [onAudioRecorded]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setRecordingTime(0);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const hasSpeechSupport = !!SpeechRecognition;

  return (
    <div className="flex items-center gap-2 mt-1.5">
      {/* Speech-to-Text button */}
      <button
        type="button"
        onClick={toggleSpeechToText}
        disabled={disabled || isRecording || !hasSpeechSupport}
        title={hasSpeechSupport ? (isListening ? 'Stop listening' : 'Speech to text — speak and it types') : 'Not supported in this browser'}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer
          ${isListening
            ? 'bg-blue-primary text-white animate-pulse'
            : 'bg-grey-bg text-grey-muted hover:bg-grey-border'}
          disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        {isListening ? <MicOff size={14} /> : <Mic size={14} />}
        {isListening ? 'Listening...' : 'Speech to Text'}
      </button>

      {/* Voice Record button */}
      {onAudioRecorded && (
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled || isListening}
          title={isRecording ? 'Stop recording' : 'Record voice note'}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer
            ${isRecording
              ? 'bg-red-urgent text-white'
              : 'bg-grey-bg text-grey-muted hover:bg-grey-border'}
            disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {isRecording ? (
            <>
              <Square size={12} fill="currentColor" />
              <span>{formatTime(recordingTime)}</span>
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            </>
          ) : (
            <>
              <Circle size={14} fill="currentColor" className="text-red-urgent" />
              Record Voice
            </>
          )}
        </button>
      )}
    </div>
  );
}
