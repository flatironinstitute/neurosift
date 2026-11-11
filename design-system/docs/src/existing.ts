// Today's Neurosift, before the redesign: Figma's captures and audit notes for each component page.

export interface Shot {
  file: string;
  alt: string;
  caption: string;
}

export interface Problem {
  title: string;
  text: string;
}

export interface Existing {
  title: string;
  lead: string;
  shots?: Shot[];
  problems?: Problem[];
  table?: { caption: string; columns: string[]; rows: string[][] };
}

const CHROMIUM = "What Neurosift shows today, as Chromium draws it.";

export const EXISTING: Record<string, Existing> = {
  iconography: {
    title: "Existing icons",
    lead: "What Neurosift ships today: three sources, each drawn differently.",
    problems: [
      { title: "Material Icons, filled", text: "19 icons from @mui/icons-material, in the app bar, tab bars, share buttons and media controls: Search, Close, Share, ContentCopy, Launch, FileDownload, Download, History, Settings, RestartAlt, ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, PlayArrow, Pause, Stop, SkipPrevious and GitHub." },
      { title: "Font Awesome", text: "4 icons from react-icons/fa, in the file tree, HDF5 view and default view: FaFolder, FaFolderOpen, FaEye and FaExternalLinkAlt. A second set, with heavier shapes than Material." },
      { title: "Text characters standing in for icons", text: "Emoji and symbols typed into labels. Each operating system draws them in its own font, some fonts lack them entirely, and screen readers read them aloud, such as “magnifying glass tilted left, plus”." },
    ],
    table: {
      caption: "Characters used as icons today",
      columns: ["Characters", "Uses", "Where"],
      rows: [
        ["Magnifying glass emoji with full-width plus and minus (U+1F50D, U+FF0B, U+FF0D)", "9", "Time toolbars: TimeScrollToolbar, TimeseriesControls, the selection bar, the spectrogram"],
        ["Arrows ← → ↑ ↓", "13", "Panning and channel paging in the same toolbars; ← Back links on EMBER pages"],
        ["Pointer and triangle characters (U+25BA, U+25BC and others)", "19", "Expand and collapse in the file tree, SLEAP tree and overview; sort in tables"],
        ["Two joined squares (U+29C9)", "2", "Copy a path in the file tree and the dataset file list"],
        ["Downwards black arrow (U+2B07)", "1", "Download in the dataset file list"],
        ["Small black square emoji (U+25AA)", "3", "Leaf items in the file tree"],
        ["Check mark (U+2713)", "2", "Figpack job status, spectrogram settings"],
      ],
    },
  },
  buttons: {
    title: "Existing buttons",
    lead: `${CHROMIUM} index.css gives every <button> 8px corners and a #dde4ed border, and Material UI adds its own uppercase, shadowed style on top.`,
    shots: [
      {
        file: "buttons-browse",
        alt: "A full-width navy button reading BROWSE DANDI in capital letters, with a drop shadow.",
        caption:
          "Home page: Material UI contained buttons in ALL CAPS, full width, with a shadow.",
      },
      {
        file: "buttons-sectionbar",
        alt: "A row of gray rounded buttons with the first one filled navy.",
        caption:
          "File viewer: gray pill buttons that behave like tabs. They belong to Tabs and segmented controls.",
      },
      {
        file: "buttons-loadpython",
        alt: "A small button reading “+ Load in Python”.",
        caption: "“+ Load in Python”: a typed plus sign in place of an icon.",
      },
      {
        file: "buttons-lindi",
        alt: "A small chip reading “Using LINDI” followed by a triangle.",
        caption:
          "“Using LINDI ▶”: a link styled as a chip, with a text triangle.",
      },
    ],
  },
  "text-inputs": {
    title: "Existing inputs",
    lead: `${CHROMIUM} Settings uses Material UI fields; the plot controls use the browser’s own inputs at their default look and size.`,
    shots: [
      {
        file: "inputs-settings",
        alt: "Settings fields with labels inside outlined boxes and gray helper text.",
        caption:
          "Settings: Material UI outlined fields. The label sits inside the field and floats up on focus; helper text starts with “Enter your…”. The Staging field’s helper calls it Sandbox, and the EMBER field further down names DANDI and api.dandiarchive.org by mistake.",
      },
      {
        file: "inputs-search",
        alt: "Three search mode radio buttons, a navy search button and a long search field.",
        caption:
          "DANDI page: the search mode as three radio buttons, an icon-only navy button to the left of the field, and a placeholder ending in an ellipsis.",
      },
      {
        file: "inputs-psth",
        alt: "PSTH controls with small browser-default text inputs.",
        caption:
          "PSTH: browser-default text inputs, “Num. bins” only 30px wide. Values outside 1–1,000 are dropped without a message.",
      },
      {
        file: "inputs-spectrogram",
        alt: "Spectrogram preprocessing fields with abbreviated labels.",
        caption:
          "Spectrogram preprocessing: “off” is a placeholder standing in for a value, the fields are about 70px wide, and labels are cut to “harm.” and “Artifact σ”.",
      },
    ],
  },
  selects: {
    title: "Existing dropdowns",
    lead: `${CHROMIUM} There are 22 browser-default <select> elements in the plot panels and four Material UI selects plus two autocompletes elsewhere, so the same choice looks different from page to page.`,
    shots: [
      {
        file: "selects-version",
        alt: "An open version select, labeled “Version:” on its left, listing 0.240827.1809 and draft (latest).",
        caption:
          "Dandiset page: a Material UI select for the version. The label sits to the left with a colon, version numbers are in the body font, and the newest working copy reads “draft (latest)”.",
      },
      {
        file: "selects-ndt",
        alt: "An autocomplete with gray pill chips for chosen neurodata types.",
        caption:
          "DANDI page, Neurodata Types Search: a Material UI autocomplete. The label sits in the border, chips are gray pills, and matching is from the start of the name only, so typing “Series” never finds ElectricalSeries.",
      },
      {
        file: "selects-psth",
        alt: "PSTH controls with browser-default selects.",
        caption:
          "PSTH: browser-default selects with “(none)” as the empty choice, and the sort order as a second select holding only Ascending and Descending.",
      },
      {
        file: "selects-spectrogram",
        alt: "Spectrogram preprocessing fields with a small notch select set to 60 Hz.",
        caption:
          "Spectrogram: the notch filter’s mains frequency is a select with just two options, 50 Hz and 60 Hz.",
      },
    ],
  },
  checkboxes: {
    title: "Checkboxes today",
    lead: "Every checkbox in neurosift.app today, read from the source. All are native browser checkboxes with no shared style.",
    table: {
      caption: "Checkboxes today",
      columns: ["Where", "Label today", "Notes"],
      rows: [
        [
          "Dandiset and EMBER pages",
          "Show NWB files only",
          "Filters the file list",
        ],
        [
          "File tree",
          "No label; the object’s name",
          "One per object, to open several in one view",
        ],
        [
          "Spectrogram channels",
          "Select all, then Channel 0, Channel 1…",
          "Select all is checked only when every channel is; with some on, it clears them",
        ],
        ["Spectrogram settings", "zero-phase, notch, f-dep", "11px, lowercase"],
        [
          "PSTH preferences",
          "Show raster, Show histogram, Smoothed",
          "Also checkboxes in the unit and align-to lists",
        ],
        [
          "Event-related signal",
          "±Std band (dashed)",
          "Dims the σ field when off",
        ],
        [
          "Pose estimation",
          "Skeleton (n), Show trails",
          "Per-keypoint visibility too",
        ],
        ["Image segmentation", "xy swap, x flip, y flip", "Plane transform"],
        [
          "Timeseries alignment, multi-video, Icephys, EDF and NIfTI viewers",
          "Varies by view",
          "Show or hide items; not yet reviewed one by one",
        ],
      ],
    },
  },
  sliders: {
    title: "Existing sliders",
    lead: "Every slider today is the browser’s own range input. This table lists them from the code; they sit in panels that need a specific file to open, so they aren’t captured here.",
    table: {
      caption: "Sliders today",
      columns: [
        "Where",
        "Slider",
        "Label today",
        "Range and step",
        "What’s missing",
      ],
      rows: [
        [
          "Image viewer",
          "Brightness, Contrast",
          "None on screen; the name is only a hover tooltip",
          "0–100",
          "A visible label and the value",
        ],
        [
          "Two-photon",
          "Plane",
          "“Plane 3:”, value inside the label",
          "0 to planes − 1",
          "A field to type a plane",
        ],
        [
          "Two-photon",
          "Brightness/contrast, two thumbs",
          "Empty; a tooltip says “Brightness/contrast”",
          "data min–max",
          "A name for what it sets: the display range",
        ],
        [
          "Event-related signal",
          "Raw trace opacity",
          "“Raw trace opacity: 0.50 (hidden)”",
          "0–1, step 0.05",
          "Nothing major; a good model for the others",
        ],
        [
          "Pose estimation",
          "Trail length, Confidence",
          "“window: 1.00 s” in faint small text",
          "0.25–5 s, step 0.25 · 0–1, step 0.05",
          "A clear label and contrast",
        ],
        [
          "Pose and multi-video",
          "Time scrubber",
          "None",
          "the session, step 0.01 s or 1/2000",
          "Becomes the Time overview",
        ],
      ],
    },
  },
  "time-controls": {
    title: "Existing time controls",
    lead: `${CHROMIUM.replace(".", ",")} from the LFP timeseries and the units raster of Dandiset 000673.`,
    shots: [
      {
        file: "time-timeseries",
        alt: "The LFP toolbar: a time window readout, magnifier emoji zoom buttons, text arrows and a dot button.",
        caption:
          "LFP timeseries: “3.75s at 0.00s” only turns into fields when clicked, hinted by a dashed underline. Zoom is a typed magnifier emoji with + or −, the arrows are text characters, and the last button is an unlabeled “.” that switches the plot to Plotly; it turns blue and reads “Plotly” when on.",
      },
      {
        file: "time-raster",
        alt: "The raster toolbar with Units controls before the time window.",
        caption:
          "Units raster: the same two groups in the opposite order, Units before Time Window, so the controls move between views.",
      },
    ],
    problems: [
      {
        title: "Typing fails silently",
        text: "A start past the end, a duration below the view’s minimum, or text that isn’t a number just snaps back to the old value, with no message.",
      },
      {
        title: "Wheel zoom needs a click",
        text: "The mouse wheel only zooms after people click inside the plot, and nothing says so.",
      },
      {
        title: "Two toolbars",
        text: "Some views add a Pan / Select-zoom toolbar in bright blue #007bff, outside the palette.",
      },
    ],
  },
  tabs: {
    title: "Existing tabs",
    lead: "What Neurosift shows today on an NWB file, as Chromium draws it.",
    shots: [
      {
        file: "tabs",
        alt: "Gray pill section tabs with Widgets filled navy, above underlined object tabs with close buttons.",
        caption:
          "Section tabs are gray pill buttons, with the selected one filled navy, so they read as buttons rather than tabs. Below them, object tabs use Material UI’s underline with a × to close.",
      },
    ],
    problems: [
      {
        title: "Tabs look like buttons",
        text: "Filled pills for Widgets, Schema and HDF5 compete with real buttons such as Load in Python.",
      },
      {
        title: "Two tab styles at once",
        text: "Pills above, underlines below: people can’t tell which level they’re on.",
      },
      {
        title: "Segments are scattered",
        text: "Search mode is radio buttons, sort order is a select, and the pan/zoom toolbar uses #007bff.",
      },
    ],
  },
  accordions: {
    title: "Existing collapsible sections",
    lead: `${CHROMIUM.replace(".", ",")} from the PSTH and LFP views of Dandiset 000673.`,
    shots: [
      {
        file: "accordions-psth",
        alt: "The PSTH side panel with dark navy section bars, all open.",
        caption:
          "PSTH panel: <details> sections with filled #34495e bars, white bold titles and text triangles. All start open, so the Units table pushes Controls below the fold.",
      },
      {
        file: "accordions-attributes",
        alt: "A blue “LFPs” heading over its attributes, then green triangle rows for the data, electrodes and starting_time datasets.",
        caption:
          "Object details under the plot: a link-blue “▼ LFPs” heading and green ► rows for datasets, with typed triangles as icons.",
      },
      {
        file: "accordions-readmore",
        alt: "A description and a contributor list, each cut off with a small “read more” link.",
        caption:
          "Overview panel: “… read more” cut into 11px text, the same link for description and contributors.",
      },
    ],
    problems: [
      {
        title: "An off-palette navy",
        text: "The bars use #34495e, a near miss of the app’s navy #2C3E50, and they outweigh the plot.",
      },
      {
        title: "Typed triangles",
        text: "▼ and ► are characters, so they change size and color with the text and can’t be styled as icons.",
      },
      {
        title: "Five sizes of the same idea",
        text: "Panel sections, object details, dataset rows, preprocessing and read more each look different.",
      },
    ],
  },
  tables: {
    title: "Existing tables and trees",
    lead: `${CHROMIUM.replace(".", ":")} the file tree of Dandiset 000728 and the PSTH unit list of 000673.`,
    shots: [
      {
        file: "tables-tree",
        alt: "A file tree with an uppercase navy NAME and SIZE header and small triangle arrows.",
        caption:
          "File tree: an uppercase NAME / SIZE bar in navy, and folders that open only from the small ► arrow, not the row.",
      },
      {
        file: "tables-units",
        alt: "A unit list with a navy header and small left-aligned spike counts.",
        caption:
          "PSTH units: the same navy header with “# spikes”, 11px numbers aligned left.",
      },
    ],
    problems: [
      {
        title: "Heavy header bars",
        text: "nwb-table-2.css paints headers #34495e with white text, an off-palette navy that outweighs the data.",
      },
      {
        title: "Cut-off values",
        text: "Cells are nowrap with an ellipsis at 400px and no tooltip, so long descriptions can’t be read.",
      },
      {
        title: "Typed sort arrows",
        text: "Sorting shows ▲ or ▼ as text characters next to the header.",
      },
    ],
  },
  alerts: {
    title: "Existing messages",
    lead: "What Neurosift showed before #29 and #32. The Settings alert was captured live; the rest come from the code, because they need an error or an embargoed file to appear.",
    shots: [
      {
        file: "alerts-saved",
        alt: "A light blue information alert: “API key saved. Please reload the page for the changes to take effect.”",
        caption:
          "Settings: a Material UI info alert in light blue appeared as soon as a key was typed, asking for a reload.",
      },
    ],
    table: {
      caption: "Messages before this system",
      columns: ["Where", "What it did", "Now"],
      rows: [
        [
          "ErrorBoundary.tsx",
          "Error alert “Something went wrong in {what}” with the error in code, Try again and Report this",
          "Done in #29: the Alert, naming the view in plain words",
        ],
        [
          "AuthErrorNotification.tsx",
          "Warning “Permission Required” with Go to Settings and Get API Key from DANDI",
          "Done in #29: a rewritten title and buttons",
        ],
        [
          "ShareTabButton.tsx",
          "“Copied!” as gray 12px text next to the icon for a moment",
          "Done in #29: a toast, “Link copied”",
        ],
        [
          "NiftiViewer.tsx",
          "A browser alert() box about 4D images",
          "Done in #29: an inline info message under the viewer",
        ],
        [
          "Plot views",
          "Error text in red, #e74c3c and #c00, with no icon",
          "Done in #32: an inline error message, one red",
        ],
        [
          "Embargoed files, bad URLs",
          "“Loading…” forever, with no message (upstream #525, #352)",
          "Done in #33: an alert once the request fails",
        ],
      ],
    },
  },
  modals: {
    title: "Existing overlays",
    lead: "Neurosift has no dialogs or drawers today. These are the nearest patterns, from the code.",
    table: {
      caption: "Overlays today",
      columns: ["Where", "What happens today", "With this system"],
      rows: [
        [
          "MainWorkspace.tsx",
          "The embargo warning is laid over the top of the workspace at z-index 1000",
          "An Alert in the view; no overlay needed",
        ],
        [
          "HorizontalSplitter.tsx",
          "The overview panel collapses with a ‹ button on the splitter; nothing changes on narrow windows",
          "Docked drawer on wide windows, overlay drawer below 1,024px",
        ],
        [
          "ShareTabButton.tsx",
          "Copies a link with the file URL and the tab, then shows “Copied!”",
          "Still one click, with a toast; a Share dialog only if options are added",
        ],
        [
          "DynamicTable.tsx",
          "A “View info about columns” button is commented out",
          "Column info in a right drawer",
        ],
        [
          "NiftiViewer.tsx",
          "A browser alert() box",
          "Inline message, not a dialog",
        ],
      ],
    },
  },
  tooltips: {
    title: "Existing tooltips",
    lead: "Neurosift uses 114 native title attributes and 7 Material UI tooltips. The Material UI one is captured below; native tooltips are drawn by the browser after a delay and don’t show in screenshots.",
    shots: [
      {
        file: "tooltips-settings",
        alt: "A small gray rounded tooltip reading Settings.",
        caption:
          "App bar: the Material UI tooltip on Settings, gray with rounded corners.",
      },
    ],
    table: {
      caption: "Native titles today",
      columns: ["Native title today", "Problem"],
      rows: [
        [
          "Zoom in (decrease time window)",
          "Only names the button on hover; no keyboard or touch access, no key shown",
        ],
        [
          "Click to edit duration",
          "An instruction hidden in hover; the duration should look editable instead",
        ],
        [
          "Share one y-scale across panels (per unit) so amplitudes are comparable. Off = each panel autoscales.",
          "Two sentences of help in a native tooltip people may never find",
        ],
        [
          "Spectrograms are being computed in the background. Changing a setting cancels the work it replaces.",
          "Status hidden in hover text; it belongs in the view as a message",
        ],
        [
          "Toggle this item in the alignment view",
          "Describes a checkbox that should have its own label",
        ],
      ],
    },
  },
  navigation: {
    title: "Existing navigation",
    lead: CHROMIUM,
    shots: [
      {
        file: "navigation-appbar",
        alt: "The navy app bar: “Neurosift (v2)” on the left; GitHub, Settings and a bare 1 on the right.",
        caption:
          "App bar: “Neurosift (v2)” goes home. On the right, GitHub, Settings and a bare “1”, which opens the file in Neurosift v1 (only its tooltip says so).",
      },
      {
        file: "navigation-back",
        alt: "A “Back to DANDI” link above a Dandiset title.",
        caption:
          "Dandiset page: “← Back to DANDI” returns to an empty search; the query is lost (upstream #321).",
      },
      {
        file: "navigation-nwbhead",
        alt: "A Dandiset title followed by a small “(view)” link.",
        caption:
          "File view: the only way up is the small “(view)” link after the Dandiset title. There’s no folder or file name (upstream #369).",
      },
      {
        file: "navigation-path",
        alt: "An HDF5 path with a share icon.",
        caption:
          "Object: the HDF5 path with a share icon that copies the tab link.",
      },
    ],
  },
  badges: {
    title: "Existing badges and tags",
    lead: "What Neurosift shows today. The search result is captured live; the rest come from the code.",
    shots: [
      {
        file: "badges-match",
        alt: "A search result with a navy rounded chip reading “22 matching”.",
        caption:
          "DANDI neurodata type search: a navy Material UI chip, “22 matching”, as a rounded pill among plain metadata text.",
      },
    ],
    table: {
      caption: "Badges and tags today",
      columns: ["Where", "Today", "With this system"],
      rows: [
        [
          "DANDI, EMBER, OpenNeuro pages",
          "“Recent:” Dandiset and dataset IDs as gray rounded Material UI chips",
          "Tag / Link in Plex Mono",
        ],
        [
          "Search results",
          "Embargo shown as orange text “Status: EMBARGOED”",
          "Warning badge “Embargoed”",
        ],
        [
          "Neurodata type search",
          "Gray chips with a round × to remove",
          "Tag / Removable",
        ],
        [
          "Home page",
          "“Neurosift Chat (experimental)” in the title",
          "Info badge “Experimental” beside the title",
        ],
      ],
    },
  },
  code: {
    title: "Existing code blocks",
    lead: "What Neurosift shows today for sub-1_ses-1_ecephys+image.nwb in Dandiset 000673, as Chromium draws it.",
    shots: [
      {
        file: "code-usage",
        alt: "A full-width gray Copy Script button above a Python script in light syntax colors.",
        caption:
          "Python usage tab: a full-width gray “Copy Script” button that reads “Copied!” for 2 seconds, then the script in Prism’s light “vs” theme. Long lines run off the right edge.",
      },
      {
        file: "code-loadpython",
        alt: "An install line and a Python script in two separate blocks with no copy buttons.",
        caption:
          "Load in Python on LFPs: the install line and the Python in two separate blocks, with no Copy button on either.",
      },
    ],
    problems: [
      {
        title: "Copy in one place only",
        text: "The usage tab has Copy Script; Load in Python has nothing, so people select by hand.",
      },
      {
        title: "Lines cut off",
        text: "URLs and long attribute comments run past the edge and need sideways scrolling.",
      },
      {
        title: "Colors from a stock theme",
        text: "Green italic comments, red strings and blue keywords come from Prism’s vs theme, not the palette.",
      },
    ],
  },
};
