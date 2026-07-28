import { Editor } from '@/components/studio/Editor'

export default async function StudioEditorPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <Editor slug={slug} />
}
