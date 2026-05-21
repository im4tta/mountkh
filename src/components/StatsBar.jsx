export default function StatsBar({ total, showing, hasSearch, provider, gmapsReady, t }) {
  const parts = [showing === total ? `${total} ${t('statsFeatures')}` : `${showing} / ${total} ${t('statsFeatures')}`];
  if (hasSearch) parts.push(`"${hasSearch}"`);

  const providerLabel = provider === 'osm'
    ? <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">OSM</span>
    : <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${gmapsReady ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'}`}>GMaps</span>;

  return (
    <div className="flex items-center justify-between px-4 py-2 text-xs text-[var(--text-secondary)] border-b border-[var(--border)] bg-[var(--bg)]">
      <span>{parts.join(' · ')}</span>
      <span className="flex items-center gap-1">
        {providerLabel}
      </span>
    </div>
  );
}
