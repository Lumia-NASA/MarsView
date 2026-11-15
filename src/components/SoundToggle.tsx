import { useEffect, useState } from "react";
import { sound } from "../lib/sound";
import { Volume2, VolumeX } from "lucide-react";

export function SoundToggle() {
  const [muted, setMuted] = useState(sound.isMuted());
  const [error, setError] = useState(sound.getError());

  useEffect(() => {
    const sync = () => { setMuted(sound.isMuted()); setError(sound.getError()); };
    const unsubscribe = sound.subscribe(sync);
    const unmount = sound.mount();
    sync();
    return () => { unsubscribe(); unmount(); };
  }, [sound]);

  const handleToggle = () => {
    const isMuted = sound.toggleMute();
    setMuted(isMuted);
    setError(sound.getError());
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={
        error
          ? "Retry ambient music and sound effects"
          : muted
            ? "Enable ambient music and sound effects"
            : "Mute ambient music and sound effects"
      }
      title={
        error ??
        (muted ? "Enable ambient music and sound effects" : "Mute all audio")
      }
      data-sound-toggle
      aria-pressed={!muted}
      data-cursor="hover"
      className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-2.5 whitespace-nowrap rounded-full border border-white/10 bg-white/[.03] px-3 text-[10px] font-mono tracking-wider text-muted transition duration-300 hover:border-copper/50 hover:bg-white/[.07] hover:text-paper"
    >
      {muted ? (
        <VolumeX size={13} className="text-muted" />
      ) : (
        <Volume2 size={13} className="text-copper animate-pulse" />
      )}
      <span className="hidden sm:inline">
        {muted ? "AUDIO: OFF" : "AUDIO: ON"}
      </span>
      {!muted && (
        <span className="flex items-center gap-0.5" aria-hidden="true">
          <span className="h-2 w-0.5 animate-[soundbar_0.8s_ease-in-out_infinite] rounded-full bg-copper" />
          <span className="h-3 w-0.5 animate-[soundbar_0.6s_ease-in-out_infinite_0.15s] rounded-full bg-copper" />
          <span className="h-1.5 w-0.5 animate-[soundbar_0.9s_ease-in-out_infinite_0.3s] rounded-full bg-copper" />
        </span>
      )}
    </button>
  );
}
