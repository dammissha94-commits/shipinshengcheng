import PageSkeleton from '@/components/ui/PageSkeleton';

export default function OutputLoading() {
  return <PageSkeleton title="家堂档案" backHref="/family" cards={3} withStats={false} withSearch={false} />;
}
