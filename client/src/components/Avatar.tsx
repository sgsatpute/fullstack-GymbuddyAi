import { getInitials } from "../utils/display";

type AvatarProps = {
  name?: string | null;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
};

export default function Avatar({ name, avatarUrl, size = "md" }: AvatarProps) {
  const sizeClass = `avatar avatar-${size}`;

  if (avatarUrl) {
    return <img className={sizeClass} src={avatarUrl} alt={`${name ?? "User"} avatar`} />;
  }

  return <div className={`${sizeClass} avatar-fallback`}>{getInitials(name)}</div>;
}
