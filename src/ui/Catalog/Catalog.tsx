import { Badge, Tag } from "../Badge/Badge";
import { Button } from "../Button/Button";
import { Checkbox } from "../Checkbox/Checkbox";
import { RemovableTag } from "../MultiSelect/MultiSelect";
import { SearchField } from "../SearchField/SearchField";
import { SegmentedControl } from "../SegmentedControl/SegmentedControl";
import { Select, type SelectOption } from "../Select/Select";
import "../base.css";
import "../row-list.css";
import "./Catalog.css";

const MODES = [
  { value: "basic", label: "Basic" },
  { value: "semantic", label: "Semantic" },
  { value: "types", label: "Neurodata types" },
];

interface SearchRowProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: (query: string) => void;
  mode: string;
  onModeChange: (mode: string) => void;
  /** Worded, such as “118 datasets”. */
  total?: string;
  loading?: boolean;
}

/** One search across DANDI, EMBER and OpenNeuro, with its three modes. */
export function SearchRow({
  query,
  onQueryChange,
  onSearch,
  mode,
  onModeChange,
  total,
  loading,
}: SearchRowProps) {
  return (
    <div className="ns-catalog-search">
      <SearchField
        label="Search datasets"
        size="lg"
        value={query}
        onChange={onQueryChange}
        onSearch={onSearch}
        loading={loading}
      />
      <div className="ns-catalog-search-meta">
        <SegmentedControl
          label="Search by"
          size="sm"
          options={MODES}
          value={mode}
          onChange={onModeChange}
        />
        {total && <span className="ns-catalog-search-total">{total}</span>}
      </div>
    </div>
  );
}

interface FilterOption {
  value: string;
  label: string;
  /** How many results have it, worded or as a number. */
  count?: string;
}

interface FilterGroupProps {
  legend: string;
  /** Where the values come from, such as “From DANDI metadata”. */
  source?: string;
  options: FilterOption[];
  value: string[];
  onChange: (value: string[]) => void;
}

/** A group of filters with a legend, one checkbox and count per value. */
export function FilterGroup({
  legend,
  source,
  options,
  value,
  onChange,
}: FilterGroupProps) {
  return (
    <fieldset className="ns-catalog-filter">
      <legend className="ns-catalog-filter-legend">{legend}</legend>
      {source && <p className="ns-catalog-filter-source">{source}</p>}
      {options.map((option) => (
        <Checkbox
          key={option.value}
          label={option.label}
          count={option.count}
          checked={value.includes(option.value)}
          onChange={(on) =>
            onChange(
              on
                ? [...value, option.value]
                : value.filter((v) => v !== option.value),
            )
          }
        />
      ))}
    </fieldset>
  );
}

interface AppliedFiltersProps {
  filters: { id: string; label: string }[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

/** The filters in force, above the results, each removable. */
export function AppliedFilters({
  filters,
  onRemove,
  onClearAll,
}: AppliedFiltersProps) {
  if (filters.length === 0) return null;
  return (
    <div className="ns-catalog-applied">
      <ul className="ns-catalog-applied-list" aria-label="Applied filters">
        {filters.map((filter) => (
          <li key={filter.id}>
            <RemovableTag
              label={filter.label}
              onRemove={() => onRemove(filter.id)}
            />
          </li>
        ))}
      </ul>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        aria-label="Clear all filters"
      >
        Clear all
      </Button>
    </div>
  );
}

interface ResultsHeadProps {
  total: string;
  sort: string;
  sortOptions: SelectOption[];
  onSortChange: (sort: string) => void;
}

/** The total, and how the results are sorted. */
export function ResultsHead({
  total,
  sort,
  sortOptions,
  onSortChange,
}: ResultsHeadProps) {
  return (
    <div className="ns-catalog-head">
      <p className="ns-catalog-total">{total}</p>
      <div className="ns-catalog-sort">
        <Select
          label="Sort by"
          size="sm"
          value={sort}
          options={sortOptions}
          onChange={onSortChange}
        />
      </div>
    </div>
  );
}

interface ResultRowProps {
  archive: string;
  id: string;
  title: string;
  href: string;
  /** Contact, file count and size, worded. */
  meta: string;
  modified: string;
  /** Neurodata types or modalities found in the dataset. */
  types?: string[];
  /** Such as “Embargoed”, shown as a warning badge. */
  status?: string;
}

/** One dataset in the results: archive and ID, a linked title, what it holds. */
export function ResultRow({
  archive,
  id,
  title,
  href,
  meta,
  modified,
  types = [],
  status,
}: ResultRowProps) {
  return (
    <li className="ns-catalog-result">
      <p className="ns-catalog-result-line">
        <Badge status="neutral">{archive}</Badge>
        <span className="ns-catalog-id">{id}</span>
        {status && <Badge status="warning">{status}</Badge>}
      </p>
      <a className="ns-catalog-title" href={href}>
        {title}
      </a>
      <p className="ns-catalog-meta">{meta}</p>
      <p className="ns-catalog-modified">{modified}</p>
      {types.length > 0 && (
        <p className="ns-catalog-types">
          {types.map((type) => (
            <Tag key={type}>{type}</Tag>
          ))}
        </p>
      )}
    </li>
  );
}

interface ShowMoreProps {
  shown: number;
  total: number;
  onMore: () => void;
}

/** More results at the end of the list, and how many are shown. */
export function ShowMore({ shown, total, onMore }: ShowMoreProps) {
  const n = (count: number) => count.toLocaleString("en-US");
  if (shown >= total)
    return <p className="ns-catalog-more">All {n(total)} shown</p>;
  return (
    <div className="ns-catalog-more">
      <Button size="sm" onClick={onMore}>
        Show more
      </Button>
      <span>
        Showing {n(shown)} of {n(total)}
      </span>
    </div>
  );
}

interface RecentItem {
  archive: string;
  id: string;
  title: string;
  href: string;
}

/** Datasets opened in this browser, newest first, on Home. */
export function RecentlyOpened({ items }: { items: RecentItem[] }) {
  return (
    <ul className="ns-row-list" aria-label="Recently opened">
      {items.map((item) => (
        <li key={`${item.archive}-${item.id}`} className="ns-row-list-row">
          <a className="ns-row-list-action" href={item.href}>
            <span className="ns-catalog-id">{item.id}</span>
            <span className="ns-catalog-recent-title">{item.title}</span>
          </a>
          <Badge status="neutral">{item.archive}</Badge>
        </li>
      ))}
    </ul>
  );
}
