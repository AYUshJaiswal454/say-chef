import { useState } from 'react';

interface AvatarProps {
  name: string;
  photoURL?: string | null;
  size?: number;
}

export function Avatar({ name, photoURL, size = 32 }: AvatarProps) {
  const [broken, setBroken] = useState(false);
  if (photoURL && !broken) {
    return (
      <img
        src={photoURL}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-enamel-soft font-semibold text-enamel"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {(name || '•').slice(0, 1).toUpperCase()}
    </span>
  );
}
