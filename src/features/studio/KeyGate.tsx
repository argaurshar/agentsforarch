import { ExternalLink, KeyRound } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { SwitchRow } from '../../components/ui/SwitchRow';
import { useProjectStore } from '../../store/useProjectStore';

interface KeyGateProps {
  /** What the user was trying to make — so the ask reads as part of that run
   *  rather than as a settings errand. */
  verb: string;
  /** Called once a key is stored, so the pending generation can continue with
   *  no second tap. */
  onReady: () => void;
}

/**
 * The key, asked at the first generation and nowhere else.
 *
 * The old flow opened the Settings drawer modally on load, before the app was
 * visible, and asked for an engine, a model ID and a storage preference at
 * once. This asks for one thing, at the moment it is needed, in the slot where
 * the result will appear — and then continues the run the user already started.
 *
 * "Remember on this device" defaults ON, which is the opposite of the old
 * panel. The key belongs to the user and lives in their own browser; making
 * them re-paste it on every visit was the single largest tax on coming back.
 * The switch is right there, labelled, for anyone on a shared machine.
 */
export function KeyGate({ verb, onReady }: KeyGateProps) {
  const setApiConfig = useProjectStore((s) => s.setApiConfig);
  const engine = useProjectStore((s) => s.engine);
  const model = useProjectStore((s) => s.model);
  const kieApiKey = useProjectStore((s) => s.kieApiKey);
  const [key, setKey] = useState('');
  const [remember, setRemember] = useState(true);

  const kie = engine === 'kie';
  const submit = () => {
    const trimmed = key.trim();
    if (!trimmed) return;
    setApiConfig({
      engine,
      key: kie ? undefined : trimmed,
      model,
      kieKey: kie ? trimmed : kieApiKey,
      remember,
    });
    onReady();
  };

  return (
    <div className="flex flex-col gap-4 rounded-card border border-hairline bg-paper p-5 shadow-card" data-key-gate>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-hairline bg-drafting text-graphite">
          <KeyRound size={15} strokeWidth={1.75} />
        </span>
        <div>
          <p className="text-title text-ink">Paste a key to {verb.toLowerCase()}</p>
          <p className="mt-1 text-body text-mist">
            {kie ? 'A kie.ai key' : 'A Google Gemini key'} — free to get, stays in this browser, and is never sent
            anywhere but {kie ? 'kie.ai' : 'Google'}.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="studio-key" className="mono-meta">
          {kie ? 'kie.ai API key' : 'Gemini API key'}
        </label>
        <input
          id="studio-key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          placeholder={kie ? 'Your kie.ai key…' : 'AIza…'}
          className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 font-mono text-body text-graphite placeholder:text-mist"
        />
      </div>

      <div className="rounded-field border border-hairline bg-drafting/50 px-3.5 py-3">
        <SwitchRow
          checked={remember}
          onChange={setRemember}
          label="Remember on this device"
          hint="Turn off on a shared computer — then it lasts this visit only."
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={submit} disabled={key.trim().length === 0}>
          Continue
        </Button>
        <a
          href={kie ? 'https://kie.ai' : 'https://aistudio.google.com/apikey'}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-control text-body text-ochre-deep underline decoration-ochre/40 underline-offset-2 transition-colors hover:decoration-ochre-deep"
        >
          Get a free key <ExternalLink size={13} strokeWidth={1.75} />
        </a>
      </div>
    </div>
  );
}
