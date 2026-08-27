import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { Select } from '../../components/ui/Select';

const ROOM_OPTIONS = [
  { value: '', label: 'Detect from the image' },
  { value: 'living room', label: 'Living room' },
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'dining room', label: 'Dining room' },
  { value: 'home office', label: 'Home office' },
] as const;

export function SpecSheetFeature() {
  return (
    <GenerationScreen feature="specSheet">
      {({ settings, patch }) => (
        <div className="p-5">
          <Select
            label="Room type"
            value={settings.roomLabel}
            options={ROOM_OPTIONS}
            onChange={(v) => patch({ roomLabel: v })}
          />
        </div>
      )}
    </GenerationScreen>
  );
}
