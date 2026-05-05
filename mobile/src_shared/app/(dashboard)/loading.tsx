
import { PageLoader } from '@/components/ui/page-loader';

export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] w-full">
      <PageLoader />
    </div>
  );
}
