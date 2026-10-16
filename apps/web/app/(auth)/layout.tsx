import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh items-center justify-center overflow-y-auto bg-gradient-to-br from-slate-100 to-slate-200">
      {children}
    </div>
  );
}
