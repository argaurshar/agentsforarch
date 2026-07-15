import { Check, Eye, EyeOff, KeyRound, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DEFAULT_MODEL } from '../../providers/runtimeConfig';
import { useProjectStore } from '../../store/useProjectStore';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const apiKey = useProjectStore((s) => s.apiKey);
  const model = useProjectStore((s) => s.model);
  const rememberKey = useProjectStore((s) => s.rememberKey);
  const forceMock = useProjectStore((s) => s.forceMock);
  const providerName = useProjectStore((s) => s.providerName);
  const setApiConfig = useProjectStore((s) => s.setApiConfig);

  const [keyDraft, setKeyDraft] = useState(apiKey ?? '');
  const [modelDraft, setModelDraft] = useState(model);
  const [remember, setRemember] = useState(rememberKey);
  const [engine, setEngine] = useState<'auto' | 'mock'>(forceMock ? 'mock' : 'auto');
  const [reveal, setReveal] = useState(false);
  const [saved, setSaved] = useState(false);

  // Re-sync the form to the store whenever the panel opens.
  useEffect(() => {
    if (open) {
      setKeyDraft(apiKey ?? '');
      setModelDraft(model);
      setRemember(rememberKey);
      setEngine(forceMock ? 'mock' : 'auto');
      setSaved(false);
    }
  }, [open, apiKey, model, rememberKey, forceMock]);

  if (!open) return null;

  const active = providerName === 'Nano Banana Pro';

  const apply = () => {
    setApiConfig({
      key: keyDraft.trim() || undefined,
      model: modelDraft.trim() || DEFAULT_MODEL,
      remember,
      forceMock: engine === 'mock',
    });
    setSaved(true);
  };

  const clear = () => {
    setKeyDraft('');
    setApiConfig({
      key: undefined,
      model: modelDraft.trim() || DEFAULT_MODEL,
      remember: false,
      forceMock: engine === 'mock',
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
            <span className="mono-meta text-ochre">{providerName}</span>
          </div>

          {/* Engine selector — force the mock even when a key is saved. */}
          <Select
            label="Engine"
            value={engine}
            options={[
              { value: 'auto', label: 'Auto — Nano Banana Pro when a key is set' },
              { value: 'mock', label: 'Mock engine (always)' },
            ]}
            onChange={(v) => {
              setEngine(v === 'mock' ? 'mock' : 'auto');
              setSaved(false);
            }}
          />

          <p className="text-sm leading-relaxed text-graphite">
            By default the app runs on a built-in <strong>mock engine</strong> — great for trying the flow with no
            key. To generate real images, add your Google&nbsp;Gemini API key to switch on{' '}
            <strong>Nano&nbsp;Banana&nbsp;Pro</strong>.
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
              {saved ? 'Saved' : 'Save key'}
            </Button>
            {apiKey ? (
              <Button variant="secondary" onClick={clear}>
                Remove key
              </Button>
            ) : null}
          </div>

          {/* Caveat */}
          <p className="border-t border-hairline pt-4 text-xs leading-relaxed text-mist">
            {active
              ? 'Nano Banana Pro is active. Generations call Google directly from your browser using your key.'
              : 'No key set — using the mock engine.'}{' '}
            Because this is a static app with no server, requests go straight from your browser to Google. Your key
            is never sent anywhere else, but a browser CORS block or an invalid key will surface as an inline error
            when you generate.
          </p>
        </div>
      </aside>
    </div>
  );
}
