import { useEffect } from 'react';
import { Check } from 'lucide-react';

export default function Toast({ message, onHide }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onHide, 2600);
    return () => clearTimeout(timer);
  }, [message, onHide]);

  if (!message) return null;
  return (
    <div className="pointer-events-none fixed bottom-[calc(6.25rem+env(safe-area-inset-bottom))] left-1/2 md:bottom-5 z-[2001] -translate-x-1/2 animate-pop-in" role="status">
      <div className="flex items-center gap-2 border border-[var(--rule)] bg-[var(--card)] px-4 py-2.5 text-[11px] font-semibold text-[var(--ink)] shadow-[var(--shadow-lift)]">
        <Check className="h-3.5 w-3.5 text-[var(--forest)]" /> {message}
      </div>
    </div>
  );
}
