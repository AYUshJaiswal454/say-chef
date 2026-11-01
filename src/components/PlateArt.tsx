import { useMemo } from 'react';
import { plateSvg, type PlateKey } from '../lib/plateArt';

interface PlateArtProps {
  seed: string;
  plate: PlateKey;
  className?: string;
}

/** The generated plate illustration. The SVG never contains user text. */
export function PlateArt({ seed, plate, className = '' }: PlateArtProps) {
  const svg = useMemo(() => plateSvg(seed, plate), [seed, plate]);
  return <div className={`plate-art ${className}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}
