export function LegalPage({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl px-4 pb-16 pt-8">
      <h1 className="text-[32px] font-extrabold leading-tight text-forest-900 md:text-5xl">{title}</h1>
      {updated && <p className="mt-2 text-sm text-ink-400">Last updated: {updated}</p>}
      <p className="mt-4 rounded-xl bg-sun-400/20 px-4 py-3 text-sm text-forest-900">
        Draft for client review — final wording to be approved by Carekar before launch.
      </p>
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-ink-600 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-forest-900 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
        {children}
      </div>
    </article>
  );
}
