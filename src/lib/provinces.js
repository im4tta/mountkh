// Display names for the province field. The dataset uses GeoNames-style English
// spellings, so Khmer labels are keyed on those exact strings.
const KM = {
  'Khaet Preah Sihanouk': 'ព្រះសីហនុ',
  'Oddar Meanchey': 'ឧត្តរមានជ័យ',
  'Preah Vihear': 'ព្រះវិហារ',
  Pursat: 'ពោធិ៍សាត់',
  Pailin: 'ប៉ៃលិន',
  Mondulkiri: 'មណ្ឌលគិរី',
  'Kampong Chhnang': 'កំពង់ឆ្នាំង',
  'Koh Kong': 'កោះកុង',
  'Stung Treng': 'ស្ទឹងត្រែង',
  'Siem Reap': 'សៀមរាប',
  Kep: 'កែប',
  Battambang: 'បាត់ដំបង',
  'Bantey Meanchey': 'បន្ទាយមានជ័យ',
  'Kampong Speu': 'កំពង់ស្ពឺ',
  Kratie: 'ក្រចេះ',
  Kampot: 'កំពត',
  Takeo: 'តាកែវ',
  'Kampong Thom': 'កំពង់ធំ',
  'Tbong Khmum': 'ត្បូងឃ្មុំ',
  Kandal: 'កណ្ដាល',
  'Kampong Cham': 'កំពង់ចាម',
  Ratanakiri: 'រតនគិរី',
  'Prey Veng': 'ព្រៃវែង',
};

export function provinceLabel(name, lang) {
  if (!name) return '';
  if (lang === 'km' && KM[name]) return KM[name];
  return name.replace(/^Khaet\s+/, '').replace(/\s+Province$/, '');
}

export function formatNumber(n, lang) {
  try {
    return new Intl.NumberFormat(lang === 'km' ? 'km-KH' : 'en').format(n);
  } catch {
    return String(n);
  }
}
