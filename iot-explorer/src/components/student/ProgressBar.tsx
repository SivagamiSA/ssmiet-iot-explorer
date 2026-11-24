import { useEffect, useState } from "react";

/** The bar grows from empty to its value when it appears, and smoothly follows later changes. */
export default function ProgressBar({ percent, label }: { percent: number; label: string }) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(p));
    return () => cancelAnimationFrame(id);
  }, [p]);
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={p} className="h-3 w-full overflow-hidden rounded-full bg-brand-100">
      <div className="h-full rounded-full bg-brand-500 transition-[width] duration-1000 ease-out motion-reduce:transition-none" style={{ width: `${shown}%` }} />
    </div>
  );
}
