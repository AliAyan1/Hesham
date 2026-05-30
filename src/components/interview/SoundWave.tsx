"use client";

const DELAYS = [0, 0.15, 0.3, 0.15, 0] as const;

type SoundWaveProps = {
  isActive: boolean;
  className?: string;
};

export function SoundWave({ isActive, className = "" }: SoundWaveProps) {
  return (
    <div
      className={`flex h-10 items-center justify-center gap-1 ${className}`}
      aria-hidden={!isActive}
    >
      {DELAYS.map((delay, i) => (
        <span
          key={i}
          className="w-1 rounded-full bg-[#1D9E75]"
          style={{
            height: isActive ? undefined : 8,
            animation: isActive ? `interview-wave 0.8s ease-in-out infinite ${delay}s` : "none",
          }}
        />
      ))}
    </div>
  );
}
