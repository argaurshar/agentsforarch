import { AppShell } from './components/Layout/AppShell';
import { AxonometricFeature } from './features/axonometric/AxonometricFeature';
import { ElevationFeature } from './features/elevation/ElevationFeature';
import { PresentationFeature } from './features/presentation/PresentationFeature';
import { RenderFeature } from './features/render/RenderFeature';
import { useProjectStore } from './store/useProjectStore';
import type { ComponentType } from 'react';
import type { TabKey } from './types';

const FEATURES: Record<TabKey, ComponentType> = {
  render: RenderFeature,
  elevation: ElevationFeature,
  axonometric: AxonometricFeature,
  presentation: PresentationFeature,
};

export default function App() {
  const tab = useProjectStore((s) => s.tab);
  const ActiveFeature = FEATURES[tab];

  return (
    <AppShell>
      {/* `key={tab}` remounts on tab change so the reveal animation replays,
          giving each feature screen a composed, unhurried arrival. */}
      <div key={tab} className="view-enter">
        <ActiveFeature />
      </div>
    </AppShell>
  );
}
