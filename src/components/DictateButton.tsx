import { useEffect, useRef, useState } from 'react';
import { useMic } from '../hooks/voice';
import { createListener, type SpeechListener } from '../lib/voice/recognition';
import { useToast } from '../state/toasts';
import { Icon } from './Icon';

interface DictateButtonProps {
  onText: (text: string) => void;
  label?: string;
}

/** Fills a field by voice: one phrase, then it stops listening. */
export function DictateButton({ onText, label = 'Dictate' }: DictateButtonProps) {
  const mic = useMic();
  const toast = useToast();
  const [listening, setListening] = useState(false);
  const listener = useRef<SpeechListener | null>(null);

  useEffect(() => () => listener.current?.stop(), []);

  const click = () => {
    if (!mic.ok) {
      toast(mic.reason);
      return;
    }
    if (listening) {
      listener.current?.stop();
      return;
    }
    listener.current = createListener({
      continuous: false,
      onText,
      onStateChange: setListening,
      onError: code => {
        setListening(false);
        toast(code === 'network' ? 'Speech recognition needs an internet connection.' : 'Dictation stopped. Check microphone access.');
      },
    });
    listener.current?.start();
  };

  const tone = listening ? 'bg-tomato text-white' : mic.ok ? 'text-enamel hover:bg-enamel-soft' : 'text-muted opacity-70';
  return (
    <button
      type="button"
      onClick={click}
      aria-pressed={listening}
      aria-label={listening ? 'Stop dictating' : label}
      title={mic.ok ? label : mic.reason}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold transition ${tone}`}
    >
      <Icon name={mic.ok ? 'mic' : 'micOff'} size={15} />
      {listening ? 'Listening…' : label}
    </button>
  );
}
