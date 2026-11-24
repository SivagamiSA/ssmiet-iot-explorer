import { useState } from "react";

interface Props { src: string; alt: string; className?: string; label?: string }

/** Shows the real photo. If the file has not been added yet, shows a clear placeholder with its expected path. */
export default function SafeImage({ src, alt, className = "", label }: Props) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div role="img" aria-label={alt} className={`flex min-w-0 items-center justify-center overflow-hidden break-all bg-surface p-4 text-center text-xs text-ink-faint ${className}`}>
        {label ?? `Add photo: public${src}`}
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={`min-w-0 object-cover ${className}`} />;
}
