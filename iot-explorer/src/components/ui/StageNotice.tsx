import { useEffect, useState } from "react";
import { NOTICE_EVENT } from "../../lib/notice";

export default function StageNotice() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: number;
    const handler = (e: Event) => {
      setMessage((e as CustomEvent<string>).detail);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setMessage(null), 4000);
    };
    window.addEventListener(NOTICE_EVENT, handler);
    return () => { window.removeEventListener(NOTICE_EVENT, handler); window.clearTimeout(timer); };
  }, []);

  if (!message) return null;
  return (
    <div role="status" className="fixed inset-x-4 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-sm rounded-md bg-ink px-5 py-3 text-sm text-white shadow-card">
      {message}
    </div>
  );
}
