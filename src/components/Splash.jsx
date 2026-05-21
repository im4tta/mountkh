import { Mountain } from 'lucide-react';

export default function Splash({ visible }) {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--bg)]">
      <div className="flex flex-col items-center gap-3">
        <Mountain className="w-12 h-12 text-[var(--accent)] animate-bounce" />
        <h1 className="text-2xl font-bold text-[var(--text)]">MountKH</h1>
        <p className="text-sm text-[var(--text-secondary)]">ភ្នំកម្ពុជា · Cambodia's Mountains</p>
        <div className="mt-2 w-8 h-8 border-4 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
      </div>
    </div>
  );
}
