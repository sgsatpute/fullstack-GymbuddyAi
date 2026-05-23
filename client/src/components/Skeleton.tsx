import clsx from "clsx";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
}

/**
 * Base Skeleton Component
 * Displays an animated loading skeleton with shimmer effect
 */
export default function Skeleton({
  width = "100%",
  height = "16px",
  borderRadius = "8px",
  className,
}: SkeletonProps) {
  const widthStyle =
    typeof width === "number" ? `${width}px` : width;
  const heightStyle =
    typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={clsx(
        "skeleton-loader bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 animate-pulse",
        className
      )}
      style={{
        width: widthStyle,
        height: heightStyle,
        borderRadius,
      }}
    />
  );
}
