import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import { FCODE_META, COUNTRY_META, COUNTRY_OPTIONS } from '../lib/utils';

export default function FilterPanel({
  open, t, lang,
  fcode, onFcodeChange, country, onCountryChange,
  province, onProvinceChange, provinces,
  sort, onSortChange, elevBand, onElevBandChange,
  favFilter, onFavFilterChange, onClear, filterCount,
}) {
  if (!open) return null;

  return (
    <div className="relative z-30 max-h-[60dvh] shrink-0 overflow-y-auto border-b border-[var(--rule)] bg-[var(--paper-2)] px-4 py-4 sm:px-6 animate-fade-up">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--rust)]" />
            <span className="eyebrow">{t('filters')}</span>
            {filterCount > 0 && <span className="chip border-[var(--rust)] text-[var(--rust)]">{filterCount}</span>}
          </div>
          <button onClick={onClear} disabled={!filterCount} className="flex min-h-10 items-center gap-1.5 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--rust)] disabled:opacity-40">
            <RotateCcw className="h-3.5 w-3.5" /> {t('clearFilters')}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {[
            { label: t('type'), value: fcode, onChange: onFcodeChange, options: [[ '', t('allTypes') ], ...Object.entries(FCODE_META).map(([k, v]) => [k, lang === 'km' ? v.labelKm : v.label])] },
            { label: t('country'), value: country, onChange: onCountryChange, options: [[ '', t('allCountries') ], ...COUNTRY_OPTIONS.map((k) => [k, `${COUNTRY_META[k]?.flag} ${lang === 'km' ? COUNTRY_META[k]?.labelKm : COUNTRY_META[k]?.label}`])] },
            { label: t('province'), value: province, onChange: onProvinceChange, options: [[ '', t('allProvinces') ], ...provinces.map((p) => [p, p])] },
            { label: t('sortLabel'), value: sort, onChange: onSortChange, options: [['name', t('sortName')], ['elev-desc', t('sortElevDesc')], ['elev-asc', t('sortElevAsc')], ['near', t('sortNear')]], wide: true },
            { label: t('elevationBand'), value: elevBand, onChange: onElevBandChange, options: [['', t('anyElevation')], ['low', t('bandLow')], ['mid', t('bandMid')], ['high', t('bandHigh')]] },
            { label: t('favorites'), value: favFilter ? 'yes' : '', onChange: (v) => onFavFilterChange(v === 'yes'), options: [['', t('allFeatures')], ['yes', t('favorites')]], wide: true },
          ].map((field) => (
            <label key={field.label} className={`flex flex-col gap-1.5 ${field.wide ? 'col-span-2 md:col-span-1' : ''}`}>
              <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">{field.label}</span>
              <select className="field h-11 text-[11px] sm:h-9" value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                {field.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
