/**
 * Route-level loading state. A bare spinner for a whole feature reads as "the
 * app hung"; a skeleton shaped like the incoming screen (header, then the
 * two-column input/output split every feature uses) reads as "it is arriving".
 */
export function FeatureSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      <div className="mb-8">
        <div className="h-5 w-40 rounded-full bg-hairline" />
        <div className="mt-4 h-9 w-2/3 rounded-field bg-hairline" />
        <div className="mt-3 h-4 w-1/2 rounded-full bg-hairline" />
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div className="h-56 rounded-card bg-hairline" />
          <div className="h-11 w-2/3 rounded-full bg-hairline" />
          <div className="h-24 rounded-card bg-hairline" />
        </div>
        <div className="h-[26rem] rounded-card bg-hairline" />
      </div>
    </div>
  );
}
