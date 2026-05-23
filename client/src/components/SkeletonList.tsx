import React from "react";
import Skeleton from "./Skeleton";

interface SkeletonListProps {
  component: React.ComponentType<any>;
  count: number;
  gap?: string;
}

/**
 * SkeletonList Component
 * Renders a list of skeleton components for loading states
 * Usage: <SkeletonList component={MatchCardSkeleton} count={5} />
 */
export default function SkeletonList({
  component: Component,
  count,
  gap = "12px",
}: SkeletonListProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {Array.from({ length: count }).map((_, index) => (
        <Component key={index} />
      ))}
    </div>
  );
}
