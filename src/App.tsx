import { Suspense, lazy } from 'react';
import { AppShell } from './components/Layout/AppShell';
import { Spinner } from './components/ui/Spinner';
import { AxonometricFeature } from './features/axonometric/AxonometricFeature';
import { ElevationFeature } from './features/elevation/ElevationFeature';
import { DashboardFeature } from './features/home/DashboardFeature';
import { GalleryFeature } from './features/gallery/GalleryFeature';
import { InteriorFeature } from './features/interior/InteriorFeature';
import { RenderFeature } from './features/render/RenderFeature';
import { useProjectStore } from './store/useProjectStore';
import type { ComponentType } from 'react';
import type { TabKey } from './types';

// The Presentation tab pulls in the Anthropic SDK, jspdf, and ~55KB of vendored
// skill markdown — none of which the image tabs need — so it is lazy-loaded to
// keep those out of the main chunk.
const PresentationFeature = lazy(() => import('./features/presentation/PresentationFeature'));

const FEATURES: Record<TabKey, ComponentType> = {
  home: DashboardFeature,
  render: RenderFeature,
  elevation: ElevationFeature,
  axonometric: AxonometricFeature,
  interior: InteriorFeature,
  presentation: PresentationFeature,
  gallery: GalleryFeature,
};

export default function App() {
  const tab = useProjectStore((s) => s.tab);
  const ActiveFeature = FEATURES[tab];

  return (
    <AppShell>
      {/* `key={tab}` remounts on tab change so the reveal animation replays,
          giving each feature screen a composed, unhurried arrival. */}
      <div key={tab} className="view-enter">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-24">
              <Spinner size={24} className="text-ochre" />
            </div>
          }
        >
          <ActiveFeature />
        </Suspense>
      </div>
    </AppShell>
  );
}
