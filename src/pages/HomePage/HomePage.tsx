import { Button, RecentlyOpened, SearchField, TextInput } from "@ui";
import { FunctionComponent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AIRegisteredComponent, useAIComponentRegistry } from "../../AIContext";
import buildInfo from "../../build-info.json";
import {
  ARCHIVES,
  archiveTotal,
  datasetTitle,
} from "../SearchPage/archiveSources";
import { getRecentDatasets, type RecentDataset } from "../util/recentDatasets";
import { linkTarget } from "./openLink";
import "./HomePage.css";

type HomePageProps = {
  width: number;
  height: number;
};

const PATHS = {
  DANDI: "dandiset",
  EMBER: "ember-dandiset",
  OpenNeuro: "openneuro-dataset",
};
const base = import.meta.env.BASE_URL;

/** The live number of datasets across the three archives, once all have answered. */
function useDatasetCount() {
  const [count, setCount] = useState<number>();
  useEffect(() => {
    Promise.all(ARCHIVES.map(archiveTotal)).then(
      (totals) => setCount(totals.reduce((a, b) => a + b, 0)),
      () => setCount(undefined),
    );
  }, []);
  return count;
}

/** Up to five recently opened datasets, with their titles. */
function useRecent() {
  const [items, setItems] = useState<(RecentDataset & { title: string })[]>([]);
  useEffect(() => {
    const recent = getRecentDatasets(5);
    setItems(recent.map((r) => ({ ...r, title: "" })));
    recent.forEach((r, i) =>
      datasetTitle(r.archive, r.id)
        .then((title) =>
          setItems((prev) =>
            prev.map((p, j) => (j === i && title ? { ...p, title } : p)),
          ),
        )
        .catch(() => {}),
    );
  }, []);
  return items;
}

/** One search across the archives, a way to open a file by link, and what was opened last. */
const HomePage: FunctionComponent<HomePageProps> = () => {
  const navigate = useNavigate();
  const count = useDatasetCount();
  const recent = useRecent();
  const [query, setQuery] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const linkToggle = useRef<HTMLButtonElement>(null);
  const linkForm = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (linkOpen) linkForm.current?.querySelector("input")?.focus();
  }, [linkOpen]);
  const closeLink = () => {
    setLinkOpen(false);
    setLinkError(undefined);
    linkToggle.current?.focus();
  };
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState<string>();
  useRegisterAIComponent();

  const open = (text: string) => {
    const target = linkTarget(text);
    if (target.kind === "file" || target.kind === "dataset")
      navigate(`/${target.path}`);
    else
      setLinkError(
        "This link doesn’t point to an NWB file. Neurosift opens .nwb, .nwb.lindi.json and .zarr files.",
      );
  };

  const search = (text: string) => {
    if (linkTarget(text).kind !== "text") {
      setLinkOpen(true);
      setLink(text.trim());
      open(text);
      return;
    }
    navigate(
      text.trim()
        ? `/search?${new URLSearchParams({ q: text.trim() })}`
        : "/search?sort=newest",
    );
  };

  return (
    <div className="home">
      <main className="home-main">
        <header className="home-hero">
          <h1 className="home-title">
            <img
              className="home-logo"
              src={`${base}neurosift-logo.png`}
              alt=""
            />
            Neurosift
          </h1>
          <p className="home-lead">
            Browse and visualize neurophysiology data, in your browser.
          </p>
        </header>
        <div className="home-search" role="search">
          <SearchField
            label="Search datasets"
            placeholder={
              count
                ? `Search ${count.toLocaleString("en-US")} datasets in DANDI, EMBER and OpenNeuro`
                : "Search datasets in DANDI, EMBER and OpenNeuro"
            }
            size="lg"
            value={query}
            onChange={setQuery}
            onSearch={search}
          />
        </div>
        <p className="home-links">
          <a href={`${base}search?sort=newest`}>Browse all datasets</a>
          <a href={`${base}search?archive=dandi&sort=newest`}>
            Browse DANDI datasets
          </a>
          <button
            ref={linkToggle}
            type="button"
            className="home-link-button"
            aria-expanded={linkOpen}
            aria-controls="home-link-form"
            onClick={() => setLinkOpen(true)}
          >
            Open a file by link
          </button>
        </p>
        {linkOpen && (
          <form
            id="home-link-form"
            ref={linkForm}
            className="home-link"
            onSubmit={(event) => {
              event.preventDefault();
              open(link);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") closeLink();
            }}
          >
            <TextInput
              label="Open a file by link"
              type="url"
              value={link}
              onChange={(value) => {
                setLink(value);
                setLinkError(undefined);
              }}
              helper="An .nwb, .nwb.lindi.json or .zarr link, or a DANDI asset download link"
              error={linkError}
            />
            <Button variant="primary" type="submit">
              Open file
            </Button>
            <Button variant="secondary" type="button" onClick={closeLink}>
              Cancel
            </Button>
          </form>
        )}
        {recent.length > 0 && (
          <section className="home-recent" aria-labelledby="home-recent-title">
            <h2 id="home-recent-title" className="home-recent-title">
              Recently opened
            </h2>
            <RecentlyOpened
              items={recent.map((r) => ({
                archive: r.archive,
                id: r.id,
                title: r.title || r.id,
                href: `${base}${PATHS[r.archive]}/${r.id}`,
              }))}
            />
          </section>
        )}
      </main>
      <footer className="home-footer">
        <a href={`${base}guide`}>NWB viewer guide</a>
        <a
          href="https://chat.neurosift.app/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Neurosift Chat
        </a>
        <a href="https://github.com/flatironinstitute/neurosift/tree/main-v2">
          View source on GitHub
        </a>
        <a href="https://github.com/flatironinstitute/neurosift/issues">
          Report a problem
        </a>
        <span className="home-version">
          {`v${buildInfo.version}`}
          {buildInfo.buildTime &&
            ` · built ${new Date(buildInfo.buildTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
        </span>
      </footer>
    </div>
  );
};

const useRegisterAIComponent = () => {
  const { registerComponentForAI, unregisterComponentForAI } =
    useAIComponentRegistry();
  useEffect(() => {
    const registration: AIRegisteredComponent = {
      id: "HomePage",
      context: aiContextDescription,
      callbacks: [],
    };
    registerComponentForAI(registration);
    return () => unregisterComponentForAI("HomePage");
  }, [registerComponentForAI, unregisterComponentForAI]);
};

const aiContextDescription = `
The user is viewing the Home page.
They can search DANDI, EMBER and OpenNeuro at once, browse all datasets, open an NWB file by its link,
or reopen a recently opened dataset. The footer links to the NWB viewer guide, Neurosift Chat,
the source code on GitHub, and a place to report problems.
`;

export default HomePage;
