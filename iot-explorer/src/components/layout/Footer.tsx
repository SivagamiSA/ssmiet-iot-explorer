import Logo from "../ui/Logo";
import { NAV_LINKS, SITE } from "../../config/site";
import { useLandingHref } from "../../lib/useLandingHref";

export default function Footer() {
  const { college } = SITE;
  const landing = useLandingHref();
  const details = [college.address, college.phone, college.email, college.website].filter(Boolean);

  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:grid-cols-2 sm:px-8 sm:py-12 md:grid-cols-3 md:gap-10">
        <div className="sm:col-span-2 md:col-span-1">
          <div className="flex items-center gap-3">
            <Logo className="h-10 w-auto" />
            <span className="font-display text-lg font-semibold">{SITE.name}</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">{SITE.tagline}.</p>
        </div>

        <div>
          <h3 className="font-semibold">College</h3>
          <p className="mt-3 text-sm text-ink-soft">{college.name}</p>
          {details.map((d) => <p key={d} className="mt-1 text-sm text-ink-soft">{d}</p>)}
        </div>

        <nav aria-label="Footer">
          <h3 className="font-semibold">Quick links</h3>
          <ul className="mt-1 text-sm">
            {NAV_LINKS.map((l) => (
              <li key={l.href}><a href={landing(l.href)} className="flex min-h-11 items-center text-ink-soft hover:text-brand-600">{l.label}</a></li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-line px-5 py-5 text-center text-sm text-ink-faint">
        © {new Date().getFullYear()} {college.name}. All rights reserved.
      </div>
    </footer>
  );
}
