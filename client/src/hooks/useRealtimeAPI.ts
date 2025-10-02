import { useEffect, useRef, useState, useCallback } from 'react';

interface RealtimeMessage {
  type: string;
  [key: string]: any;
}

export function useRealtimeAPI() {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string>('');
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const [transcript, setTranscript] = useState<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const recordedChunksRef = useRef<Blob[]>([]);
  const sentenceAudioMap = useRef<Map<string, Blob>>(new Map());
  const isRecordingRef = useRef(false);

  const connect = useCallback(() => {
    console.log('Attempting to connect to realtime API...');
    setConnectionError('');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/api/realtime`;
    console.log('WebSocket URL:', url);

    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('Connected to realtime API');
      setIsConnected(true);
      setConnectionError('');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'error') {
          console.error('Server error:', message.message);
          setConnectionError(message.message);
          setIsConnected(false);
          return;
        }

        console.log('Received message type:', message.type, message);
        setMessages(prev => [...prev, message]);

        if (message.type === 'conversation.item.input_audio_transcription.completed') {
          setTranscript(prev => prev + ' ' + message.transcript);

          if (isRecordingRef.current && recordedChunksRef.current.length > 0) {
            const audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
            const transcriptId = message.item_id || `transcript-${Date.now()}`;
            sentenceAudioMap.current.set(transcriptId, audioBlob);
            console.log('🎵 Captured audio for sentence:', transcriptId, 'size:', audioBlob.size);

            recordedChunksRef.current = [];
          }
        }

        if (message.type === 'response.audio.delta') {
          console.log('Playing audio delta');
          playAudioChunk(message.delta);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionError('WebSocket connection error');
      setIsConnected(false);
    };

    ws.onclose = (event) => {
      console.log('Disconnected from realtime API', event.code, event.reason);
      setIsConnected(false);
      if (event.code !== 1000) {
        setConnectionError(`Connection closed unexpectedly: ${event.reason || 'Unknown error'}`);
      }
    };

    wsRef.current = ws;
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    stopRecording();
  }, []);

  const playAudioChunk = async (base64Audio: string) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      nextStartTimeRef.current = audioContextRef.current.currentTime;
    }

    const audioData = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));
    const int16Array = new Int16Array(audioData.buffer);
    const float32Array = new Float32Array(int16Array.length);

    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    const audioBuffer = audioContextRef.current.createBuffer(
      1,
      float32Array.length,
      24000
    );
    audioBuffer.getChannelData(0).set(float32Array);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);

    const now = audioContextRef.current.currentTime;
    const startTime = Math.max(now, nextStartTimeRef.current);
    source.start(startTime);

    nextStartTimeRef.current = startTime + audioBuffer.duration;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      recordedChunksRef.current = [];
      isRecordingRef.current = true;
      sentenceAudioMap.current.clear();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && isRecordingRef.current) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        isRecordingRef.current = false;
        console.log('🛑 Recording stopped');
      };

      mediaRecorderRef.current = mediaRecorder;

      const audioContext = new AudioContext({ sampleRate: 24000 });
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      source.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const int16Array = new Int16Array(inputData.length);

        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        const base64Audio = btoa(
          String.fromCharCode(...new Uint8Array(int16Array.buffer))
        );

        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'audio',
              data: base64Audio,
            })
          );
        }
      };

      mediaRecorder.start(100);
      console.log('🎤 Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'commit' }));
    }
  };

  const sendText = (text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'text',
          text: text,
        })
      );
    }
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const getSentenceAudio = (transcriptId: string): Blob | null => {
    return sentenceAudioMap.current.get(transcriptId) || null;
  };

  return {
    isConnected,
    connectionError,
    messages,
    transcript,
    getSentenceAudio,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    sendText,
  };
}
