import { useLocation } from "react-router-dom";

/** "#about" on the landing page, "/#about" on any other page, so section links work everywhere. */
export function useLandingHref() {
  const onHome = useLocation().pathname === "/";
  return (hash: string) => (onHome ? hash : `/${hash}`);
}
