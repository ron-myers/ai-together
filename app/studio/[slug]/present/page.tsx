import { Present } from '@/components/studio/Present'

export default async function PresentPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <Present slug={slug} />
}
