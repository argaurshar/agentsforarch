import { Check, Eye, EyeOff, KeyRound, ShieldCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DEFAULT_MODEL } from '../../providers/runtimeConfig';
import type { EngineKey } from '../../providers/runtimeConfig';
import { useDialog } from '../../lib/useDialog';
import { useProjectStore } from '../../store/useProjectStore';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';

const ENGINE_OPTIONS: { value: EngineKey; label: string; sub: string }[] = [
  { value: 'gemini', label: 'Google Gemini', sub: 'Nano Banana Pro' },
  { value: 'kie', label: 'kie.ai', sub: 'Nano Banana 2' },
];

// index.css is owned by the foundation, so the drawer's entrance keyframe is
// scoped here. Transform/opacity only, and it stands down under
// prefers-reduced-motion like every other entrance in the app.
const DRAWER_MOTION = `
@keyframes settings-drawer-in {
  from { opacity: 0; transform: translateX(28px); }
  to { opacity: 1; transform: none; }
}
.settings-drawer-enter { animation: settings-drawer-in 320ms var(--ease) both; }
@media (prefers-reduced-motion: reduce) {
  .settings-drawer-enter { animation: none; }
}
`;

interface KeyFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  revealed: boolean;
  onToggleReveal: () => void;
  /** Accessible names for the reveal toggle — kept verbatim, tests select on them. */
  showLabel: string;
  hideLabel: string;
  linkHref: string;
  linkText: string;
}

/**
 * One composite treatment for all three secret fields. The reveal control sits
 * inside the field's padding rather than slicing a hard divider through it, so
 * the input keeps a single rounded silhouette and the global :focus-visible
 * ring traces that silhouette instead of a bare rectangle.
 */
function KeyField({
  id,
  label,
  value,
  onChange,
  placeholder,
  revealed,
  onToggleReveal,
  showLabel,
  hideLabel,
  linkHref,
  linkText,
}: KeyFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-label text-graphite">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={revealed ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-field border border-hairline bg-paper py-2.5 pl-3.5 pr-12 font-mono text-body text-graphite transition-colors placeholder:text-mist hover:border-mist/40"
        />
        <IconButton
          icon={revealed ? <EyeOff size={14} strokeWidth={1.75} /> : <Eye size={14} strokeWidth={1.75} />}
          label={revealed ? hideLabel : showLabel}
          onClick={onToggleReveal}
          className="absolute right-1.5 top-1/2 -translate-y-1/2"
        />
      </div>
      <a
        href={linkHref}
        target="_blank"
        rel="noreferrer noopener"
        className="w-fit text-label text-ochre-deep underline decoration-ochre-deep/40 underline-offset-2 transition-colors hover:decoration-ochre-deep"
      >
        {linkText}
      </a>
    </div>
  );
}

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const engine = useProjectStore((s) => s.engine);
  const apiKey = useProjectStore((s) => s.apiKey);
  const model = useProjectStore((s) => s.model);
  const kieApiKey = useProjectStore((s) => s.kieApiKey);
  const rememberKey = useProjectStore((s) => s.rememberKey);
  const engineReady = useProjectStore((s) => s.engineReady);
  const claudeApiKey = useProjectStore((s) => s.claudeApiKey);
  const providerName = useProjectStore((s) => s.providerName);
  const setApiConfig = useProjectStore((s) => s.setApiConfig);

  const [engineDraft, setEngineDraft] = useState<EngineKey>(engine);
  const [keyDraft, setKeyDraft] = useState(apiKey ?? '');
  const [modelDraft, setModelDraft] = useState(model);
  const [kieDraft, setKieDraft] = useState(kieApiKey ?? '');
  const [claudeDraft, setClaudeDraft] = useState(claudeApiKey ?? '');
  const [remember, setRemember] = useState(rememberKey);
  const [reveal, setReveal] = useState(false);
  const [kieReveal, setKieReveal] = useState(false);
  const [claudeReveal, setClaudeReveal] = useState(false);
  const [saved, setSaved] = useState(false);

  // Re-sync the form to the store whenever the panel opens.
  useEffect(() => {
    if (open) {
      setEngineDraft(engine);
      setKeyDraft(apiKey ?? '');
      setModelDraft(model);
      setKieDraft(kieApiKey ?? '');
      setClaudeDraft(claudeApiKey ?? '');
      setRemember(rememberKey);
      setSaved(false);
    }
  }, [open, engine, apiKey, model, kieApiKey, claudeApiKey, rememberKey]);

  const dialogRef = useDialog<HTMLElement>({ open, onClose });

  if (!open) return null;

  const active = engineReady;

  const apply = () => {
    setApiConfig({
      engine: engineDraft,
      key: keyDraft.trim() || undefined,
      model: modelDraft.trim() || DEFAULT_MODEL,
      kieKey: kieDraft.trim() || undefined,
      remember,
      claudeKey: claudeDraft.trim() || undefined,
    });
    setSaved(true);
  };

  const clearAll = () => {
    setKeyDraft('');
    setKieDraft('');
    setClaudeDraft('');
    setApiConfig({
      engine: engineDraft,
      key: undefined,
      model: modelDraft.trim() || DEFAULT_MODEL,
      kieKey: undefined,
      remember: false,
      claudeKey: undefined,
    });
    setSaved(false);
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <style>{DRAWER_MOTION}</style>
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden="true" />
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="API keys"
        tabIndex={-1}
        className="settings-drawer-enter relative flex h-full w-full max-w-md flex-col rounded-l-card bg-bone shadow-card-lg"
      >
        {/* Header stays put: it is the drawer's only exit, so it must never scroll away. */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-hairline bg-bone/90 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <KeyRound size={18} strokeWidth={1.75} className="text-mist" />
            <h2 className="font-display text-title font-semibold text-ink">Settings</h2>
          </div>
          <IconButton
            icon={<X size={16} strokeWidth={1.75} />}
            label="Close settings"
            onClick={onClose}
          />
        </header>

        <div className="flex flex-1 flex-col gap-8 overflow-y-auto px-6 py-6">
          {/* Image generation ------------------------------------------------ */}
          <section className="flex flex-col gap-4">
            <h3 className="section-heading">Image generation</h3>

            {/* Current status */}
            <div className="flex items-center justify-between rounded-field border border-hairline bg-paper px-4 py-3">
              <span className="text-body text-graphite">Active engine</span>
              <span
                className={`rounded-full px-2.5 py-1 text-caption font-medium ${
                  active ? 'bg-success-soft text-success' : 'bg-drafting text-mist'
                }`}
              >
                {providerName}
              </span>
            </div>

            {/* Engine picker */}
            <div className="flex flex-col gap-2">
              <span className="text-label text-graphite">Engine</span>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Image engine">
                {ENGINE_OPTIONS.map((opt) => {
                  const selected = engineDraft === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        setEngineDraft(opt.value);
                        setSaved(false);
                      }}
                      className={`flex flex-col items-start gap-0.5 rounded-field border px-3.5 py-3 text-left transition-all active:scale-[0.98] ${
                        // Filled accent selection uses the deep ochre: white text at
                        // label size is only legible against it, not against bg-ochre.
                        selected
                          ? 'border-ochre-deep bg-ochre-deep text-white'
                          : 'border-hairline bg-paper text-graphite hover:bg-drafting hover:border-mist/40'
                      }`}
                    >
                      <span className="text-label font-semibold">{opt.label}</span>
                      <span className={`text-caption ${selected ? 'text-white/80' : 'text-mist'}`}>{opt.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {engineDraft === 'gemini' ? (
              <>
                <p className="text-body text-graphite">
                  Generates <strong>real images</strong> with your Google&nbsp;Gemini API key via{' '}
                  <strong>Nano&nbsp;Banana&nbsp;Pro</strong>. The key is free to get and stays in your browser.
                </p>

                <KeyField
                  id="api-key"
                  label="Gemini API key"
                  value={keyDraft}
                  onChange={(v) => {
                    setKeyDraft(v);
                    setSaved(false);
                  }}
                  placeholder="AIza…"
                  revealed={reveal}
                  onToggleReveal={() => setReveal((r) => !r)}
                  showLabel="Show key"
                  hideLabel="Hide key"
                  linkHref="https://aistudio.google.com/apikey"
                  linkText="Get a free key from Google AI Studio →"
                />

                {/* Model */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="api-model" className="text-label text-graphite">
                    Model
                  </label>
                  <input
                    id="api-model"
                    value={modelDraft}
                    onChange={(e) => {
                      setModelDraft(e.target.value);
                      setSaved(false);
                    }}
                    spellCheck={false}
                    className="w-full rounded-field border border-hairline bg-paper px-3.5 py-2.5 font-mono text-body text-graphite transition-colors hover:border-mist/40"
                  />
                  <p className="text-label font-normal leading-relaxed text-mist">
                    Defaults to Nano Banana Pro ({DEFAULT_MODEL}). Change only if Google renames it.
                  </p>
                </div>
              </>
            ) : (
              <>
                <p className="text-body text-graphite">
                  Generates <strong>real images</strong> with your kie.ai API key via{' '}
                  <strong>Nano&nbsp;Banana&nbsp;2</strong> (kie.ai&apos;s hosted Google image model). Generations use
                  your kie.ai credits; the key stays in your browser.
                </p>

                <KeyField
                  id="kie-key"
                  label="kie.ai API key"
                  value={kieDraft}
                  onChange={(v) => {
                    setKieDraft(v);
                    setSaved(false);
                  }}
                  placeholder="Your kie.ai key…"
                  revealed={kieReveal}
                  onToggleReveal={() => setKieReveal((r) => !r)}
                  showLabel="Show kie.ai key"
                  hideLabel="Hide kie.ai key"
                  linkHref="https://kie.ai/api-key"
                  linkText="Get your key from kie.ai →"
                />
              </>
            )}
          </section>

          {/* Presentation composer (Claude) — sections are separated by one
              divider treatment; the first abuts the header rule instead. */}
          <section className="flex flex-col gap-4 border-t border-hairline pt-8">
            <h3 className="section-heading">Presentation composer</h3>
            <p className="text-body text-graphite">
              Add a Claude API key to let <strong>Compose&nbsp;with&nbsp;Claude</strong> arrange your deck and write
              brand-voiced titles and captions (uses Claude Opus&nbsp;4.8).
            </p>

            <KeyField
              id="claude-key"
              label="Claude API key"
              value={claudeDraft}
              onChange={(v) => {
                setClaudeDraft(v);
                setSaved(false);
              }}
              placeholder="sk-ant-…"
              revealed={claudeReveal}
              onToggleReveal={() => setClaudeReveal((r) => !r)}
              showLabel="Show Claude key"
              hideLabel="Hide Claude key"
              linkHref="https://console.anthropic.com/settings/keys"
              linkText="Get a key from the Anthropic Console →"
            />
          </section>

          {/* Storage & trust ------------------------------------------------- */}
          <section className="flex flex-col gap-4 border-t border-hairline pt-8">
            <h3 className="section-heading">Key storage</h3>

            {/* The whole row is the target — a bare 16px checkbox is not one. */}
            <label className="-m-3 flex cursor-pointer items-start gap-3 rounded-field p-3 transition-colors hover:bg-drafting">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-hairline accent-ochre"
              />
              <span className="text-body text-graphite">
                Remember on this device
                <span className="mt-0.5 block text-label font-normal leading-relaxed text-mist">
                  Stores the key in this browser so you don't re-enter it. Only do this on a device you trust.
                </span>
              </span>
            </label>

            {/* The app's core trust claim — it gets a surface, not fine print. */}
            <div className="flex gap-3 rounded-field bg-drafting p-4">
              <ShieldCheck size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-mist" />
              <p className="text-label font-normal leading-relaxed text-graphite">
                {active
                  ? `${providerName} is active. Generations call the engine directly from your browser using your key.`
                  : 'No image key set yet — pick an engine and add its key above to start generating.'}{' '}
                Because this is a static app with no server, all requests go straight from your browser to the engine
                you chose (Google, kie.ai or Anthropic). Your keys are never sent anywhere else, but a browser CORS
                block or an invalid key will surface as an inline error.
              </p>
            </div>
          </section>
        </div>

        {/* Commit row is pinned outside the scroller: Save must be reachable
            without scrolling to the bottom of a long form. */}
        <div className="sticky bottom-0 flex items-center gap-3 border-t border-hairline bg-bone/90 px-6 py-4 backdrop-blur">
          <Button variant="primary" onClick={apply} icon={saved ? <Check size={16} strokeWidth={2} /> : undefined}>
            {saved ? 'Saved' : 'Save'}
          </Button>
          {apiKey || kieApiKey || claudeApiKey ? (
            <Button variant="secondary" onClick={clearAll}>
              Clear keys
            </Button>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
