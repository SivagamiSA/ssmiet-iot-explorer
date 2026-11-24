import { useState } from "react";
import { SITE } from "../../config/site";

/** Other places/names an uploaded logo commonly ends up in. Tried in order if the main path fails. */
const base = SITE.college.logo.replace(/\.[a-z]+$/i, "");
const CANDIDATES = [
  SITE.college.logo,
  ...["png", "jpg", "jpeg", "svg", "webp"].map((ext) => `${base}.${ext}`),
  "/images/logo/logo.png", "/images/logo.png", "/logo.png",
].filter((v, i, a) => a.indexOf(v) === i);

const initials = SITE.college.name.split(/\s+/).filter((w) => /^[A-Z]+$/.test(w)).slice(0, 2).join("") || "IoT";

/** Shows the official logo as-is (never redrawn). If the file is missing at every known path, shows the college initials instead of a broken image. */
export default function Logo({ className = "h-10 w-auto" }: { className?: string }) {
  const [i, setI] = useState(0);
  if (i >= CANDIDATES.length) {
    return (
      <span role="img" aria-label={`${SITE.college.name} logo`} className={`inline-flex aspect-square items-center justify-center rounded-md bg-brand-500 font-display text-xs font-bold text-white ${className}`}>
        {initials}
      </span>
    );
  }
  return <img key={CANDIDATES[i]} src={CANDIDATES[i]} alt={`${SITE.college.name} logo`} onError={() => setI(i + 1)} className={`object-contain ${className}`} />;
}
