import { GLYPHS } from '../lib/iconmcp';

export default function MountainGlyph({ name = 'mountain', className = '', style, title }) {
  const glyph = GLYPHS[name] || GLYPHS.mountain;
  return (
    <svg
      className={className}
      style={style}
      viewBox={glyph.viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      {glyph.paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}
