import { Check, Eye, EyeOff, KeyRound, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DEFAULT_MODEL } from '../../providers/runtimeConfig';
import { useProjectStore } from '../../store/useProjectStore';
import { Button } from '../ui/Button';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const apiKey = useProjectStore((s) => s.apiKey);
  const model = useProjectStore((s) => s.model);
  const rememberKey = useProjectStore((s) => s.rememberKey);
  const engineReady = useProjectStore((s) => s.engineReady);
  const claudeApiKey = useProjectStore((s) => s.claudeApiKey);
  const providerName = useProjectStore((s) => s.providerName);
  const setApiConfig = useProjectStore((s) => s.setApiConfig);

  const [keyDraft, setKeyDraft] = useState(apiKey ?? '');
  const [modelDraft, setModelDraft] = useState(model);
  const [claudeDraft, setClaudeDraft] = useState(claudeApiKey ?? '');
  const [remember, setRemember] = useState(rememberKey);
  const [reveal, setReveal] = useState(false);
  const [claudeReveal, setClaudeReveal] = useState(false);
  const [saved, setSaved] = useState(false);

  // Re-sync the form to the store whenever the panel opens.
  useEffect(() => {
    if (open) {
      setKeyDraft(apiKey ?? '');
      setModelDraft(model);
      setClaudeDraft(claudeApiKey ?? '');
      setRemember(rememberKey);
      setSaved(false);
    }
  }, [open, apiKey, model, claudeApiKey, rememberKey]);

  if (!open) return null;

  const active = engineReady;

  const apply = () => {
    setApiConfig({
      key: keyDraft.trim() || undefined,
      model: modelDraft.trim() || DEFAULT_MODEL,
      remember,
      claudeKey: claudeDraft.trim() || undefined,
    });
    setSaved(true);
  };

  const clearAll = () => {
    setKeyDraft('');
    setClaudeDraft('');
    setApiConfig({
      key: undefined,
      model: modelDraft.trim() || DEFAULT_MODEL,
      remember: false,
      claudeKey: undefined,
    });
    setSaved(false);
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Image generation settings"
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-hairline bg-bone"
      >
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <div className="flex items-center gap-2">
            <KeyRound size={16} strokeWidth={1.75} className="text-ochre" />
            <p className="eyebrow">Image Generation</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-graphite hover:text-ochre focus-visible:outline-ochre"
            aria-label="Close settings"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex flex-col gap-6 px-6 py-6">
          {/* Current status */}
          <div className="flex items-center justify-between border border-hairline bg-paper px-4 py-3">
            <span className="text-sm text-graphite">Active engine</span>
            <span className={`mono-meta ${active ? 'text-ochre' : 'text-mist'}`}>{providerName}</span>
          </div>

          <p className="text-sm leading-relaxed text-graphite">
            This app generates <strong>real images</strong> with your Google&nbsp;Gemini API key via{' '}
            <strong>Nano&nbsp;Banana&nbsp;Pro</strong>. Add your key below to start — it&apos;s free to get and stays
            in your browser.
          </p>

          {/* Key input */}
          <div className="flex flex-col gap-2">
            <label htmlFor="api-key" className="mono-meta">
              Gemini API key
            </label>
            <div className="flex items-stretch border border-hairline bg-paper focus-within:outline focus-within:outline-2 focus-within:outline-ochre">
              <input
                id="api-key"
                type={reveal ? 'text' : 'password'}
                value={keyDraft}
                onChange={(e) => {
                  setKeyDraft(e.target.value);
                  setSaved(false);
                }}
                placeholder="AIza…"
                autoComplete="off"
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent px-3 py-2.5 font-mono text-sm text-graphite placeholder:text-mist focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setReveal((r) => !r)}
                className="border-l border-hairline px-3 text-mist hover:text-ochre focus-visible:outline-ochre"
                aria-label={reveal ? 'Hide key' : 'Show key'}
              >
                {reveal ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
              </button>
            </div>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer noopener"
              className="w-fit text-xs text-ochre underline underline-offset-2 hover:text-[#a8380b]"
            >
              Get a free key from Google AI Studio →
            </a>
          </div>

          {/* Model */}
          <div className="flex flex-col gap-2">
            <label htmlFor="api-model" className="mono-meta">
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
              className="border border-hairline bg-paper px-3 py-2.5 font-mono text-sm text-graphite focus-visible:outline-ochre"
            />
            <p className="text-xs text-mist">Defaults to Nano Banana Pro ({DEFAULT_MODEL}). Change only if Google renames it.</p>
          </div>

          {/* Presentation composer (Claude) */}
          <div className="flex flex-col gap-2 border-t border-hairline pt-6">
            <p className="eyebrow">Presentation Composer</p>
            <p className="text-sm leading-relaxed text-graphite">
              Add a Claude API key to let <strong>Compose&nbsp;with&nbsp;Claude</strong> arrange your deck and write
              brand-voiced titles and captions (uses Claude Opus&nbsp;4.8).
            </p>
            <label htmlFor="claude-key" className="mono-meta mt-1">
              Claude API key
            </label>
            <div className="flex items-stretch border border-hairline bg-paper focus-within:outline focus-within:outline-2 focus-within:outline-ochre">
              <input
                id="claude-key"
                type={claudeReveal ? 'text' : 'password'}
                value={claudeDraft}
                onChange={(e) => {
                  setClaudeDraft(e.target.value);
                  setSaved(false);
                }}
                placeholder="sk-ant-…"
                autoComplete="off"
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent px-3 py-2.5 font-mono text-sm text-graphite placeholder:text-mist focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setClaudeReveal((r) => !r)}
                className="border-l border-hairline px-3 text-mist hover:text-ochre focus-visible:outline-ochre"
                aria-label={claudeReveal ? 'Hide Claude key' : 'Show Claude key'}
              >
                {claudeReveal ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
              </button>
            </div>
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noreferrer noopener"
              className="w-fit text-xs text-ochre underline underline-offset-2 hover:text-[#a8380b]"
            >
              Get a key from the Anthropic Console →
            </a>
          </div>

          {/* Remember */}
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#c2410c]"
            />
            <span className="text-sm text-graphite">
              Remember on this device
              <span className="mt-0.5 block text-xs text-mist">
                Stores the key in this browser so you don't re-enter it. Only do this on a device you trust.
              </span>
            </span>
          </label>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button variant="primary" onClick={apply} icon={saved ? <Check size={16} strokeWidth={2} /> : undefined}>
              {saved ? 'Saved' : 'Save'}
            </Button>
            {apiKey || claudeApiKey ? (
              <Button variant="secondary" onClick={clearAll}>
                Clear keys
              </Button>
            ) : null}
          </div>

          {/* Caveat */}
          <p className="border-t border-hairline pt-4 text-xs leading-relaxed text-mist">
            {active
              ? 'Nano Banana Pro is active. Generations call Google directly from your browser using your key.'
              : 'No image key set yet — add one above to start generating.'}{' '}
            Because this is a static app with no server, all requests go straight from your browser to Google / Anthropic.
            Your keys are never sent anywhere else, but a browser CORS block or an invalid key will surface as an inline
            error.
          </p>
        </div>
      </aside>
    </div>
  );
}
