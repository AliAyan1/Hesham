"use client";

import { ExternalLink, Search, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";

type CmsItem = {
  id: string;
  key: string;
  valueEn: string;
  valueAr: string;
  section: string;
  label: string;
  type: string;
  updatedAt: string;
  updatedBy: string | null;
};

type SaveState = "idle" | "saving" | "saved" | "error";

type Toast = {
  id: number;
  kind: "success" | "error";
  message: string;
};

type SectionDef = {
  id: string;
  icon: string;
  label: string;
  previewHref: string;
};

type DraftState = Record<string, { valueEn: string; valueAr: string }>;
type SaveStates = Record<string, SaveState>;

const SECTION_DEFS: SectionDef[] = [
  { id: "landing", icon: "🏠", label: "Landing Page", previewHref: "/" },
  { id: "about", icon: "📋", label: "About Page", previewHref: "/about" },
  { id: "contact", icon: "📞", label: "Contact Page", previewHref: "/contact" },
  { id: "faq", icon: "❓", label: "FAQ Questions", previewHref: "/#faq" },
  {
    id: "platform",
    icon: "⚙️",
    label: "Platform Messages",
    previewHref: "/dashboard/job-seeker/assessment",
  },
];

const CHARACTER_LIMITS: Record<string, number> = {
  hero_title: 60,
  hero_subtitle: 160,
  cta_title: 80,
  footer_tagline: 60,
};

function getCharacterLimit(item: CmsItem): number {
  if (CHARACTER_LIMITS[item.key]) return CHARACTER_LIMITS[item.key];
  return item.type === "textarea" || item.type === "richtext" ? 4000 : 160;
}

function sameDraft(item: CmsItem, draft: DraftState[string] | undefined): boolean {
  if (!draft) return true;
  return draft.valueEn === item.valueEn && draft.valueAr === item.valueAr;
}

function buildLocalizedHref(locale: string, href: string): string {
  if (href === "/") return `/${locale}`;
  return `/${locale}${href}`;
}

export default function AdminCmsClient() {
  const locale = useLocale();
  const [items, setItems] = useState<CmsItem[]>([]);
  const [activeSection, setActiveSection] = useState<string>("landing");
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<DraftState>({});
  const [saveStates, setSaveStates] = useState<SaveStates>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((kind: Toast["kind"], message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/cms", { credentials: "include" });
      const json = (await res.json()) as { ok?: boolean; items?: CmsItem[]; error?: string };
      if (!res.ok || !json.ok || !json.items) {
        throw new Error(json.error ?? "Failed to load content");
      }
      setItems(json.items);
      setDrafts(
        Object.fromEntries(
          json.items.map((item) => [item.key, { valueEn: item.valueEn, valueAr: item.valueAr }]),
        ),
      );
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load content");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((item) => {
      if (!normalized) return true;
      return (
        item.key.toLowerCase().includes(normalized) ||
        item.label.toLowerCase().includes(normalized) ||
        item.section.toLowerCase().includes(normalized) ||
        item.valueEn.toLowerCase().includes(normalized) ||
        item.valueAr.toLowerCase().includes(normalized)
      );
    });
  }, [items, query]);

  const visibleSections = useMemo(() => {
    const sectionIds = new Set(filteredItems.map((item) => item.section));
    return SECTION_DEFS.filter((section) => sectionIds.has(section.id));
  }, [filteredItems]);

  useEffect(() => {
    if (!visibleSections.some((section) => section.id === activeSection)) {
      setActiveSection(visibleSections[0]?.id ?? "landing");
    }
  }, [activeSection, visibleSections]);

  const sectionItems = useMemo(
    () => filteredItems.filter((item) => item.section === activeSection),
    [filteredItems, activeSection],
  );

  const unsavedKeys = useMemo(
    () => items.filter((item) => !sameDraft(item, drafts[item.key])).map((item) => item.key),
    [drafts, items],
  );

  const unsavedSet = useMemo(() => new Set(unsavedKeys), [unsavedKeys]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!unsavedKeys.length) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [unsavedKeys]);

  const saveItem = useCallback(
    async (item: CmsItem) => {
      const draft = drafts[item.key];
      if (!draft || sameDraft(item, draft)) return;

      setSaveStates((current) => ({ ...current, [item.key]: "saving" }));
      try {
        const res = await fetch(`/api/admin/cms/${item.key}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: item.key,
            valueEn: draft.valueEn,
            valueAr: draft.valueAr,
          }),
        });

        const json = (await res.json()) as { ok?: boolean; item?: CmsItem; error?: string };
        if (!res.ok || !json.ok || !json.item) {
          throw new Error(json.error ?? "Save failed");
        }

        const updatedItem = json.item;

        setItems((current) => current.map((entry) => (entry.key === item.key ? updatedItem : entry)));
        setDrafts((current) => ({
          ...current,
          [item.key]: { valueEn: updatedItem.valueEn, valueAr: updatedItem.valueAr },
        }));
        setSaveStates((current) => ({ ...current, [item.key]: "saved" }));
        pushToast("success", `${item.label} saved`);
        window.setTimeout(() => {
          setSaveStates((current) =>
            current[item.key] === "saved" ? { ...current, [item.key]: "idle" } : current,
          );
        }, 1800);
      } catch (error) {
        setSaveStates((current) => ({ ...current, [item.key]: "error" }));
        pushToast(
          "error",
          error instanceof Error ? error.message : `Error saving ${item.label}`,
        );
      }
    },
    [drafts, pushToast],
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 text-sm text-[#6B7280]">
        Loading content...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {loadError}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0D2137] md:text-3xl">Content Management</h1>
            <p className="mt-2 text-sm text-[#6B7280]">
              Edit all website text in Arabic and English.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden />
            Changes go live within 60 seconds
          </span>
        </div>
        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <label className="relative block w-full max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by label, key, or text"
              className="min-h-11 w-full rounded-xl border border-[#D1D5DB] bg-white pl-10 pr-4 text-sm text-[#0D2137] focus:border-[#0F4C75] focus:outline-none focus:ring-2 focus:ring-[#0F4C75]/20"
            />
          </label>
          {unsavedKeys.length ? (
            <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <TriangleAlert className="h-4 w-4" aria-hidden />
              You have unsaved changes.
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
          <div className="space-y-2">
            {visibleSections.map((section) => {
              const unsavedCount = filteredItems.filter(
                (item) => item.section === section.id && unsavedSet.has(item.key),
              ).length;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors ${
                    activeSection === section.id
                      ? "bg-[#0F4C75] text-white"
                      : "bg-[#F8FAFC] text-[#0D2137] hover:bg-[#EEF4FF]"
                  }`}
                >
                  <span className="flex items-center gap-3 text-sm font-semibold">
                    <span aria-hidden>{section.icon}</span>
                    {section.label}
                  </span>
                  {unsavedCount ? (
                    <span
                      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                        activeSection === section.id
                          ? "bg-amber-300 text-[#0D2137]"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {unsavedCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#0D2137]">
                {SECTION_DEFS.find((section) => section.id === activeSection)?.label ?? "Section"}
              </h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                Save each field individually. Arabic fields use RTL automatically.
              </p>
            </div>
            <a
              href={buildLocalizedHref(
                locale,
                SECTION_DEFS.find((section) => section.id === activeSection)?.previewHref ?? "/",
              )}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#0F4C75] px-4 py-2 text-sm font-semibold text-[#0F4C75] hover:bg-[#EEF4FF]"
            >
              Preview
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          </div>

          {sectionItems.length ? (
            sectionItems.map((item) => {
              const draft = drafts[item.key] ?? { valueEn: item.valueEn, valueAr: item.valueAr };
              const isDirty = !sameDraft(item, draft);
              const saveState = saveStates[item.key] ?? "idle";
              const limit = getCharacterLimit(item);
              const Editor = item.type === "textarea" || item.type === "richtext" ? "textarea" : "input";

              return (
                <article
                  key={item.key}
                  className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-3 border-b border-[#F3F4F6] pb-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-[#0D2137]">{item.label}</h3>
                        {isDirty ? (
                          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" aria-label="Unsaved changes" />
                        ) : null}
                      </div>
                      <p className="mt-1 font-mono text-xs text-[#6B7280]">{item.key}</p>
                    </div>
                    <div className="text-sm">
                      {saveState === "saving" ? (
                        <span className="font-semibold text-[#0F4C75]">🔄 Saving...</span>
                      ) : saveState === "saved" ? (
                        <span className="font-semibold text-emerald-700">✅ Saved!</span>
                      ) : saveState === "error" ? (
                        <span className="font-semibold text-red-600">❌ Error saving</span>
                      ) : (
                        <span className="text-[#6B7280]">Updated {new Date(item.updatedAt).toLocaleString()}</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5">
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-[#0D2137]">English</span>
                      <Editor
                        value={draft.valueEn}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [item.key]: {
                              valueEn: event.target.value,
                              valueAr: current[item.key]?.valueAr ?? item.valueAr,
                            },
                          }))
                        }
                        rows={Editor === "textarea" ? 4 : undefined}
                        className="min-h-11 w-full rounded-xl border border-[#D1D5DB] px-4 py-3 text-sm text-[#0D2137] focus:border-[#0F4C75] focus:outline-none focus:ring-2 focus:ring-[#0F4C75]/20"
                      />
                      <FieldMeta count={draft.valueEn.length} limit={limit} />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-[#0D2137]">Arabic (عربي)</span>
                      <Editor
                        dir="rtl"
                        value={draft.valueAr}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [item.key]: {
                              valueEn: current[item.key]?.valueEn ?? item.valueEn,
                              valueAr: event.target.value,
                            },
                          }))
                        }
                        rows={Editor === "textarea" ? 4 : undefined}
                        className="min-h-11 w-full rounded-xl border border-[#D1D5DB] px-4 py-3 text-right text-sm text-[#0D2137] focus:border-[#0F4C75] focus:outline-none focus:ring-2 focus:ring-[#0F4C75]/20"
                      />
                      <FieldMeta count={draft.valueAr.length} limit={limit} />
                    </label>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={!isDirty || saveState === "saving"}
                      onClick={() => void saveItem(item)}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0F4C75] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0D2137] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Save Changes
                    </button>
                    {isDirty ? (
                      <button
                        type="button"
                        onClick={() =>
                          setDrafts((current) => ({
                            ...current,
                            [item.key]: { valueEn: item.valueEn, valueAr: item.valueAr },
                          }))
                        }
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#D1D5DB] px-5 py-3 text-sm font-semibold text-[#374151] hover:bg-[#F9FAFB]"
                      >
                        Reset
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-[#D1D5DB] bg-white p-10 text-center text-sm text-[#6B7280]">
              No content found for this search.
            </div>
          )}
        </section>
      </div>

      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${
              toast.kind === "success"
                ? "bg-emerald-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}

function FieldMeta({ count, limit }: { count: number; limit: number }) {
  const over = count > limit;
  return (
    <div className={`text-xs ${over ? "text-amber-700" : "text-[#6B7280]"}`}>
      {count}/{limit}
      {over ? " Recommended max exceeded" : ""}
    </div>
  );
}
