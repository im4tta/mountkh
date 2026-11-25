import { Component } from 'react';

const TEXT = {
  km: { title: 'មានបញ្ហាអ្វីមួយកើតឡើង', body: 'ផ្នែកនេះមិនអាចបង្ហាញបានទេ។ ទិន្នន័យរបស់អ្នកមិនបាត់ឡើយ។', retry: 'ព្យាយាមម្តងទៀត', reload: 'ផ្ទុកកម្មវិធីឡើងវិញ' },
  en: { title: 'Something went wrong', body: 'This part could not be shown. Your saved places are safe.', retry: 'Try again', reload: 'Reload app' },
};

function currentLang() {
  try { return JSON.parse(localStorage.getItem('mountkh_lang')) === 'en' ? 'en' : 'km'; } catch { return 'km'; }
}

// Keeps a crash in one view from blanking the whole app. Changing `resetKey`
// (for example switching view or map provider) clears the error automatically.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) { return { error }; }

  componentDidCatch(error, info) { console.error('UI crashed', error, info?.componentStack); }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    const tx = TEXT[currentLang()];
    return (
      <div className="grid h-full min-h-[50vh] place-items-center p-6 text-center" role="alert">
        <div className="max-w-xs">
          <h2 className="serif text-xl font-bold">{tx.title}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">{tx.body}</p>
          <div className="mt-5 flex flex-col gap-2">
            <button className="btn btn-solid" onClick={() => this.setState({ error: null })}>{tx.retry}</button>
            <button className="btn" onClick={() => window.location.reload()}>{tx.reload}</button>
          </div>
        </div>
      </div>
    );
  }
}
