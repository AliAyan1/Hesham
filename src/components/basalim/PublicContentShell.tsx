import type { ReactNode } from "react";

type PublicContentShellProps = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
};

/** Simple inner page wrapper (navbar/footer via PublicLayout). */
export function PublicContentShell({ title, subtitle, children }: PublicContentShellProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
      <h1 className="text-3xl font-bold text-[#0D1F2D] md:text-4xl">{title}</h1>
      {subtitle ? <p className="mt-4 text-lg text-[#6B7280]">{subtitle}</p> : null}
      {children ? <div className="mt-10 prose prose-neutral max-w-none">{children}</div> : null}
    </div>
  );
}
