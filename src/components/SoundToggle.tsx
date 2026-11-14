import { useEffect, useState } from "react";
import { sound } from "../lib/sound";
import { Volume2, VolumeX } from "lucide-react";

export function SoundToggle() {
  const [muted, setMuted] = useState(sound.isMuted());

  useEffect(() => {
    return sound.subscribe((isMuted) => setMuted(isMuted));
  }, []);

  const handleToggle = () => {
    sound.toggleMute();
  };

  return (
    <button
      onClick={handleToggle}
      aria-label={muted ? "Enable interface sound effects" : "Mute interface sound effects"}
      aria-pressed={!muted}
      data-cursor="hover"
      className="inline-flex h-9 items-center gap-2.5 rounded-full border border-white/10 bg-white/[.03] px-3 text-[10px] font-mono tracking-wider text-muted transition duration-300 hover:border-copper/50 hover:bg-white/[.07] hover:text-paper"
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
