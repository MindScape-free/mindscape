
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Renders a loading skeleton for the redesigned dashboard.
 * @returns {JSX.Element} The loading skeleton UI.
 */
export default function DashboardLoading() {
  return (
    <div className="container mx-auto p-4 sm:p-8">
      <div className="text-center mb-12">
        <Skeleton className="h-10 w-1/2 mx-auto mb-4" />
        <Skeleton className="h-5 w-3/4 mx-auto" />
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
        <div className="relative w-full max-w-sm">
          <Skeleton className="h-10 w-full glassmorphism rounded-md" />
        </div>
        <Skeleton className="h-10 w-full sm:w-[180px] glassmorphism rounded-md" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="rounded-3xl bg-[#1C1C1E] p-4 flex flex-col h-full">
            <Skeleton className="h-7 w-3/4 mb-2" />
            <div className="flex-grow min-h-[20px]" />
            <div className="flex justify-between items-center mt-2">
              <Skeleton className="h-5 w-1/3" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
