import { AppShell } from './components/Layout/AppShell';
import { FeatureErrorBoundary } from './components/ui/FeatureErrorBoundary';
import { AxonometricFeature } from './features/axonometric/AxonometricFeature';
import { MassingFeature } from './features/concept/MassingFeature';
import { CadElevationFeature } from './features/drawings/CadElevationFeature';
import { RenderToPlanFeature } from './features/drawings/RenderToPlanFeature';
import { SectionFeature } from './features/drawings/SectionFeature';
import { SketchPlanFeature } from './features/drawings/SketchPlanFeature';
import { CategoryScreen } from './features/category/CategoryScreen';
import { ElevationFeature } from './features/elevation/ElevationFeature';
import { DashboardFeature } from './features/home/DashboardFeature';
import { GalleryFeature } from './features/gallery/GalleryFeature';
import { InteriorFeature } from './features/interior/InteriorFeature';
import { DeclutterFeature } from './features/interiors/DeclutterFeature';
import { PlaceObjectFeature } from './features/interiors/PlaceObjectFeature';
import { SpecSheetFeature } from './features/interiors/SpecSheetFeature';
import { TargetedSwapFeature } from './features/interiors/TargetedSwapFeature';
import { MoodboardFeature } from './features/moodboard/MoodboardFeature';
import { RenderFeature } from './features/render/RenderFeature';
import { useHashRoute } from './lib/useHashRoute';
import { useProjectStore } from './store/useProjectStore';
import type { ComponentType } from 'react';
import { categoryFromTab } from './features/registry/keys';
import type { FeatureKind } from './types';

// Tool screens. Category destinations are not in here — there is one screen for
// all of them, parameterised by which category, so a new category needs no entry
// anywhere: it exists because a tool declared it.
const FEATURES: Record<FeatureKind | 'home' | 'gallery', ComponentType> = {
  home: DashboardFeature,
  massing: MassingFeature,
  render: RenderFeature,
  sketchPlan: SketchPlanFeature,
  elevation: ElevationFeature,
  cadElevation: CadElevationFeature,
  section: SectionFeature,
  renderToPlan: RenderToPlanFeature,
  axonometric: AxonometricFeature,
  interior: InteriorFeature,
  declutter: DeclutterFeature,
  placeObject: PlaceObjectFeature,
  targetedSwap: TargetedSwapFeature,
  specSheet: SpecSheetFeature,
  moodboard: MoodboardFeature,
  gallery: GalleryFeature,
};

export default function App() {
  useHashRoute();
  const tab = useProjectStore((s) => s.tab);
  const category = categoryFromTab(tab);
  const ActiveFeature = category ? null : FEATURES[tab as FeatureKind | 'home' | 'gallery'];

  return (
    <AppShell>
      {/* `key={tab}` remounts on tab change so the reveal animation replays,
          giving each feature screen a composed, unhurried arrival. */}
      <div key={tab} className="view-enter">
        <FeatureErrorBoundary resetKey={tab}>
          {category ? <CategoryScreen category={category} /> : ActiveFeature ? <ActiveFeature /> : null}
        </FeatureErrorBoundary>
      </div>
    </AppShell>
  );
}
