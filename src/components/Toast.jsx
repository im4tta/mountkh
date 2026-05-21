import { useEffect } from 'react';

export default function Toast({ message, onHide }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onHide, 2500);
    return () => clearTimeout(t);
  }, [message, onHide]);

  if (!message) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] px-4 py-2 rounded-full bg-[var(--text)] text-white text-sm shadow-lg transition-opacity duration-300">
      {message}
    </div>
  );
}
