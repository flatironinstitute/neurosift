import {
  Disclosure,
  EmptyState,
  FilterGroup,
  InlineMessage,
  MultiSelect,
  ResultRow,
  ResultsHead,
  SearchRow,
  ShowMore,
  SkeletonRows,
} from "@ui";
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ARCHIVES, typeCounts } from "./archiveSources";
import type { Archive, Order } from "./catalogFeed";
import { useCatalog, useTypesIndex, type Mode } from "./useCatalog";
import useRegisterSearchAI from "./useRegisterSearchAI";
import { metaLine, n, plural } from "./metaLine";
import "./SearchPage.css";

type Props = {
  width: number;
  height: number;
  /** Set by the old /dandi, /ember and /openneuro addresses. */
  archive?: Archive;
};

const SITES: Record<Archive, { label: string; href: string }> = {
  DANDI: {
    label: "Visit the DANDI Archive",
    href: "https://dandiarchive.org/",
  },
  EMBER: {
    label: "Visit the EMBER Archive",
    href: "https://dandi.emberarchive.org/",
  },
  OpenNeuro: { label: "Visit OpenNeuro", href: "https://openneuro.org/" },
};

const SORTS: { value: Order; label: string }[] = [
  { value: "best", label: "Best match" },
  { value: "modified", label: "Recently modified" },
  { value: "newest", label: "Newest" },
];

const shortDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

const fromParam = (value: string | null) =>
  ARCHIVES.filter((a) =>
    value?.toLowerCase().split(",").includes(a.toLowerCase()),
  );

/** One search across DANDI, OpenNeuro and EMBER, with the filters and modes they share. */
const SearchPage: FunctionComponent<Props> = ({ archive }) => {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const mode = (params.get("mode") as Mode | null) ?? "basic";
  const order = (params.get("sort") as Order | null) ?? "best";
  const types = params.get("types")?.split(",").filter(Boolean) ?? [];
  const archives = params.has("archive")
    ? fromParam(params.get("archive"))
    : archive
      ? [archive]
      : ARCHIVES;
  const [draft, setDraft] = useState(query);
  useEffect(() => setDraft(query), [query]);

  const update = (changes: Record<string, string | undefined>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(changes))
          if (v) next.set(k, v);
          else next.delete(k);
        return next;
      },
      { replace: false },
    );

  const { index, failed: indexFailed } = useTypesIndex(mode === "types");
  const typeOptions = useMemo(
    () =>
      index
        ? typeCounts(index).map(({ type, count }) => ({
            value: type,
            label: type,
            meta: plural(count, "Dandiset"),
          }))
        : [],
    [index],
  );

  const catalog = useCatalog({ query, archives, mode, types, order }, index);
  useRegisterSearchAI();

  const shownArchives: Archive[] = mode === "basic" ? archives : ["DANDI"];
  const total = shownArchives.reduce(
    (sum, a) => sum + (catalog.totals[a] ?? 0),
    0,
  );
  const heading =
    mode === "types"
      ? types.length > 0
        ? `${plural(total, "dataset")} contain ${types.join(" and ")}`
        : "Pick the types a dataset should contain"
      : query
        ? `${plural(total, "dataset")} for “${query}”`
        : mode === "semantic"
          ? "Describe what you’re looking for"
          : `${plural(total, "dataset")}`;
  const filtersOn =
    (mode === "basic" ? ARCHIVES.length - archives.length : 0) + types.length;
  const single =
    mode === "basic" && archives.length === 1 ? archives[0] : undefined;
  const others = ARCHIVES.filter(
    (a) => !catalog.failed.includes(a) && shownArchives.includes(a),
  );

  const filters = (
    <div className="catalog-filters">
      <FilterGroup
        legend="Archive"
        source={
          mode === "basic"
            ? undefined
            : "Search by meaning and Contains search DANDI only"
        }
        options={ARCHIVES.map((a) => ({
          value: a,
          label: a,
          count:
            mode === "basic" && catalog.totals[a] !== undefined
              ? n(catalog.totals[a]!)
              : undefined,
        }))}
        value={shownArchives}
        onChange={(next) =>
          update({
            archive:
              next.length === ARCHIVES.length
                ? undefined
                : next.join(",").toLowerCase() || "none",
            mode: undefined,
          })
        }
      />
      {mode === "types" && (
        <MultiSelect
          label="Contains · DANDI"
          helper={
            indexFailed
              ? "The types index didn’t load."
              : "Dandisets with a file holding every type you pick"
          }
          options={typeOptions}
          value={types}
          onChange={(next) => update({ types: next.join(",") || undefined })}
          code
          noun="types"
        />
      )}
      {single && (
        <a
          className="catalog-site"
          href={SITES[single].href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {SITES[single].label}
        </a>
      )}
    </div>
  );

  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="catalog-page">
      <SearchRow
        query={draft}
        onQueryChange={setDraft}
        onSearch={(q) => update({ q: q.trim() || undefined })}
        mode={mode}
        onModeChange={(m) => update({ mode: m === "basic" ? undefined : m })}
        total={catalog.loading ? undefined : plural(total, "dataset")}
        loading={catalog.loading}
      />
      {mode !== "basic" && (
        <InlineMessage status="info">
          Searching DANDI only. OpenNeuro and EMBER are hidden.
        </InlineMessage>
      )}
      <div className="catalog-layout">
        <aside className="catalog-aside" aria-label="Filters">
          <div className="catalog-filters-narrow">
            <Disclosure
              label={filtersOn > 0 ? `Filters · ${filtersOn}` : "Filters"}
              expandedLabel="Hide filters"
              open={filtersOpen}
              onToggle={setFiltersOpen}
            >
              {filters}
            </Disclosure>
          </div>
          <div className="catalog-filters-wide">{filters}</div>
        </aside>
        <section className="catalog-results" aria-label="Results">
          <ResultsHead
            total={heading}
            sort={order}
            sortOptions={SORTS}
            onSortChange={(s) => update({ sort: s === "best" ? undefined : s })}
          />
          {catalog.failed.length > 0 && (
            <InlineMessage status="warning">
              {`${catalog.failed.join(" and ")} didn’t respond.${others.length ? ` Showing ${others.join(" and ")}.` : ""} `}
              <button
                type="button"
                className="catalog-retry"
                onClick={catalog.retry}
              >
                Try again
              </button>
            </InlineMessage>
          )}
          {catalog.semanticError && (
            <InlineMessage status="error">
              Search by meaning is unavailable right now, often because of API
              quota limits. Try Basic search.
            </InlineMessage>
          )}
          {catalog.loading ? (
            <SkeletonRows rows={6} />
          ) : catalog.items.length === 0 ? (
            query || types.length > 0 ? (
              <EmptyState
                title={`No datasets match ${query ? `“${query}”` : "these types"}.`}
                action={
                  filtersOn > 0
                    ? {
                        label: "Clear filters",
                        onClick: () =>
                          update({ archive: undefined, types: undefined }),
                      }
                    : undefined
                }
              >
                {mode === "basic"
                  ? "Check the spelling, try Semantic search, or clear the filters."
                  : "Try fewer words or types, or Basic search."}
              </EmptyState>
            ) : null
          ) : (
            <>
              <ul className="catalog-list">
                {catalog.items.map((item) => (
                  <ResultRow
                    key={`${item.archive}-${item.id}`}
                    archive={item.archive}
                    id={item.id}
                    title={item.title}
                    href={`${import.meta.env.BASE_URL}${item.path}`}
                    meta={metaLine(item)}
                    modified={
                      item.modified
                        ? `Modified ${shortDate(item.modified)}`
                        : ""
                    }
                    types={item.types}
                    status={item.status}
                  />
                ))}
              </ul>
              <ShowMore
                shown={catalog.items.length}
                total={
                  catalog.exhausted
                    ? catalog.items.length
                    : Math.max(total, catalog.items.length + 1)
                }
                onMore={catalog.more}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default SearchPage;
