
import { PageLoader } from '@/components/ui/page-loader';

export default function RootLoading() {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9999] flex items-center justify-center">
      <PageLoader />
    </div>
  );
}
