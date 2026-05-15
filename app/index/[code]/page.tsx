import { ComingSoon } from "@/components/primitives/ComingSoon";

export default async function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const scope = `index code ${code}`;
  return (
    <ComingSoon
      title="Index · alias path · coming soon"
      scope={scope}
      job="Alias of /indices/[slug] matching the function-bar grammar (\`index <code>\` in the palette)."
      data="Same as /indices/[slug]."
      status="Will redirect to /indices/[slug] when /indices/[slug] populates."
    />
  );
}
