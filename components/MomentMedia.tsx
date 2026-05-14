import { mediaUrl } from "@/lib/utils";

export function MomentMedia({
  flowId,
  type = "hero",
  width = 320,
  className,
  alt,
}: {
  flowId: string;
  type?: "hero" | "video-square" | "video-tall" | "player" | "jersey" | "transparent" | "hero-wide";
  width?: number;
  className?: string;
  alt?: string;
}) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={mediaUrl(flowId, type, { width, quality: 80 })}
      width={width}
      height={width}
      alt={alt ?? "moment"}
      className={className}
      loading="lazy"
    />
  );
}
