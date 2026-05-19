import type { ReactNode } from "react";
import BottomNav from "./BottomNav";
import TopBar from "./TopBar";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <TopBar />
      <main>{children}</main>
      <BottomNav />
    </div>
  );
}
