import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Action } from "../../config/actions";
import { showNotice } from "../../lib/notice";

interface Props {
  action: Action;
  variant?: "primary" | "outline" | "text";
  size?: "md" | "lg";
  className?: string;
  onClick?: () => void;
  children: ReactNode;
}

const base = "inline-flex touch-manipulation items-center justify-center rounded-md font-semibold transition-colors";
const variants = {
  primary: "bg-brand-500 text-white shadow-sm hover:bg-brand-600 active:bg-brand-700",
  outline: "border border-brand-500 text-brand-600 hover:bg-brand-50 active:bg-brand-100",
  text: "min-h-11 text-ink hover:text-brand-600 underline underline-offset-4 decoration-line hover:decoration-brand-500",
};
const sizes = { md: "h-11 px-5 text-sm", lg: "h-12 px-7 text-base" };

/** Link for actions that may belong to a later stage. Not-ready actions show a notice instead of faking behaviour. */
export default function ActionLink({ action, variant = "primary", size = "md", className = "", onClick, children }: Props) {
  const cls = `${base} ${variants[variant]} ${variant === "text" ? "" : sizes[size]} ${className}`;
  if (!action.ready) {
    return (
      <button type="button" className={cls} onClick={() => showNotice(action.notice ?? "This feature is coming in a later stage.")}>
        {children}
      </button>
    );
  }
  if (action.href.startsWith("/")) return <Link to={action.href} className={cls} onClick={onClick}>{children}</Link>;
  return <a href={action.href} className={cls} onClick={onClick}>{children}</a>;
}
