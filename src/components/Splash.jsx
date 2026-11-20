import MountainGlyph from './MountainGlyph';

export default function Splash({ visible }) {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-[var(--paper)]">
      <div className="contours absolute inset-0 opacity-60" />
      <div className="relative text-center animate-pop-in">
        <MountainGlyph className="mx-auto h-16 w-16 text-[var(--forest)]" />
        <div className="serif mt-4 text-3xl font-bold tracking-tight">Mount<span className="text-[var(--rust)]">KH</span></div>
        <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">ភ្នំកម្ពុជា · Field guide</div>
        <div className="mx-auto mt-6 h-px w-32 overflow-hidden bg-[var(--rule)]">
          <div className="h-full w-1/3 bg-[var(--rust)]" style={{ animation: 'shimmer 1.2s linear infinite' }} />
        </div>
      </div>
    </div>
  );
}
