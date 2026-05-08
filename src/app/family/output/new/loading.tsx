import PageSkeleton from '@/components/ui/PageSkeleton';

export default function NewOutputLoading() {
  return <PageSkeleton title="整理档案" backHref="/family/output" cards={4} withStats={false} withSearch={false} />;
}
