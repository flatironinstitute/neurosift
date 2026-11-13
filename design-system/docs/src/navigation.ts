export interface NavItem {
  label: string;
  href: string;
  summary?: string;
}

export interface NavSection {
  heading?: string;
  items: NavItem[];
}

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

export const withBase = (href: string): string => `${base}${href}`;

export const navigation: NavSection[] = [
  {
    heading: "Get started",
    items: [
      { label: "Overview", href: "/" },
      {
        label: "About Neurosift",
        href: "/get-started/about/",
        summary: "What Neurosift is, and who this system is for.",
      },
      {
        label: "Vision and principles",
        href: "/get-started/vision/",
        summary: "The vision, and five rules that settle design decisions.",
      },
      {
        label: "How to use the system",
        href: "/get-started/how-to-use/",
        summary: "Where designers, developers and scientists start.",
      },
    ],
  },
  {
    heading: "Foundations",
    items: [
      {
        label: "Typography",
        href: "/foundations/typography/",
        summary:
          "IBM Plex Sans JP and Plex Mono, the scale, and scientific text.",
      },
      {
        label: "Color palette",
        href: "/foundations/color/",
        summary:
          "The colors people know, the scales around them, and colors for data.",
      },
      {
        label: "Iconography",
        href: "/foundations/iconography/",
        summary: "IBM Carbon icons, their sizes and what they replace.",
      },
      {
        label: "Spacing and layout grid",
        href: "/foundations/spacing/",
        summary:
          "One 4px scale, the workspace's regions, breakpoints and targets.",
      },
      {
        label: "Corner radius",
        href: "/foundations/radius/",
        summary: "3px for controls, square for data.",
      },
      {
        label: "Elevation and borders",
        href: "/foundations/elevation/",
        summary: "Rules and edges first; shadows only for what floats.",
      },
      {
        label: "Motion",
        href: "/foundations/motion/",
        summary: "Short, cued motion around the data, and none in it.",
      },
      {
        label: "Accessibility",
        href: "/foundations/accessibility/",
        summary: "WCAG 2.2 AA as the floor; every plot has words and numbers.",
      },
    ],
  },
  {
    heading: "Tokens",
    items: [
      {
        label: "Color",
        href: "/tokens/color/",
        summary:
          "Primitive, semantic and data colors, each a CSS custom property.",
      },
      {
        label: "Typography",
        href: "/tokens/typography/",
        summary: "Fifteen text styles and the IBM Plex font stacks.",
      },
      {
        label: "Spacing",
        href: "/tokens/spacing/",
        summary: "The 4px space scale, icon sizes and workspace dimensions.",
      },
      {
        label: "Radius and elevation",
        href: "/tokens/radius-and-elevation/",
        summary: "Corners, border widths, shadows and the focus ring.",
      },
      {
        label: "States",
        href: "/tokens/states/",
        summary: "Hover, pressed, focus, selected, disabled and error.",
      },
    ],
  },
  {
    heading: "Usage guidelines",
    items: [
      {
        label: "Voice and content",
        href: "/guidelines/voice/",
        summary: "Precise, plain and considerate, in two modes of one voice.",
      },
      {
        label: "Scientific notation and units",
        href: "/guidelines/notation/",
        summary: "Exact identifiers, readable numbers, one spelling per unit.",
      },
      {
        label: "Data visualization",
        href: "/guidelines/data-visualization/",
        summary: "One set of rules for every plot; the data gets the hue.",
      },
      {
        label: "Errors and access",
        href: "/guidelines/errors/",
        summary: "Where each error goes, how to word it, and API keys.",
      },
      {
        label: "Empty states",
        href: "/guidelines/empty-states/",
        summary: "Say why it’s empty and offer one way forward.",
      },
      {
        label: "Loading and large data",
        href: "/guidelines/loading/",
        summary: "Say what is loading, how far along, and what is too big.",
      },
    ],
  },
  {
    heading: "Components",
    items: [
      {
        label: "Buttons",
        href: "/components/buttons/",
        summary: "Button and Icon button: four styles, three sizes, every state.",
      },
      {
        label: "Text inputs and search",
        href: "/components/text-inputs/",
        summary:
          "Text input, Text area and Search field: labels, units, errors in words.",
      },
      {
        label: "Dropdowns and selects",
        href: "/components/selects/",
        summary: "Select and Menu: one value or one action from a list.",
      },
      {
        label: "Checkboxes",
        href: "/components/checkboxes/",
        summary: "On, off and mixed, with the whole row as the target.",
      },
      {
        label: "Sliders",
        href: "/components/sliders/",
        summary:
          "Slider and Range slider: feel by eye, exact numbers in a field.",
      },
      {
        label: "Time controls",
        href: "/components/time-controls/",
        summary: "Time window, Channel window, Time overview and Playback.",
      },
      {
        label: "Image zoom",
        href: "/components/image-zoom/",
        summary: "Zoom and pan over one image: buttons, wheel, pinch, drag and keys.",
      },
      {
        label: "Tabs and segmented controls",
        href: "/components/tabs/",
        summary:
          "Tabs between views of a file; segments for two to four settings.",
      },
      {
        label: "Accordions",
        href: "/components/accordions/",
        summary:
          "Accordion item and Disclosure: sections of a panel, and more on request.",
      },
      {
        label: "Tables",
        href: "/components/tables/",
        summary:
          "DataTable and Tree: rules, not fills, and the whole row as the target.",
      },
      {
        label: "Description list",
        href: "/components/description-list/",
        summary:
          "Keys and values: panel fields, dataset facts and HDF5 attributes.",
      },
      {
        label: "Legend and color bar",
        href: "/components/legend/",
        summary:
          "What each color in a plot means, beside the plot it explains.",
      },
      {
        label: "Alerts and toasts",
        href: "/components/alerts/",
        summary: "Alert, Toast and Inline message: what happened, what to do.",
      },
      {
        label: "Modals and drawers",
        href: "/components/modals/",
        summary:
          "Dialog and Drawer: one decision at a time, and panels beside the data.",
      },
      {
        label: "Tooltips",
        href: "/components/tooltips/",
        summary:
          "Tooltip, Toggletip and Info button: names and help on request.",
      },
      {
        label: "Navigation and breadcrumbs",
        href: "/components/navigation/",
        summary: "App bar, Breadcrumbs and Object path: where people are.",
      },
      {
        label: "Badges and tags",
        href: "/components/badges/",
        summary:
          "Badge, Tag / Link and Tag / Static: statuses, counts and values.",
      },
      {
        label: "Code block",
        href: "/components/code/",
        summary:
          "Code block and Inline code: Python people can copy, read and run.",
      },
      {
        label: "Pages and sections",
        href: "/components/pages/",
        summary: "Page and Section: a page's title, column and titled panels.",
      },
      {
        label: "Status bar",
        href: "/components/status-bar/",
        summary: "The build version and what the file has loaded, in words.",
      },
      {
        label: "Overview panel",
        href: "/components/overview-panel/",
        summary:
          "Session and Dandiset details beside the viewer, resizable and collapsible.",
      },
      {
        label: "View panel",
        href: "/components/view-panel/",
        summary: "The frame every view shares, around Neurosift’s own charts.",
      },
      {
        label: "Catalog",
        href: "/components/catalog/",
        summary:
          "Search, filters and result rows across DANDI, EMBER and OpenNeuro.",
      },
      {
        label: "Status bar",
        href: "/components/status-bar/",
        summary: "The build version and what the file has loaded, in words.",
      },
    ],
  },
  {
    heading: "UI library",
    items: [
      {
        label: "What exists today",
        href: "/ui-library/what-exists-today/",
        summary:
          "Every part of Neurosift: what it does, and what a redesign must keep.",
      },
      {
        label: "Settings",
        href: "/ui-library/settings/",
        summary:
          "The API keys Neurosift sends to DANDI, the sandbox and EMBER.",
      },
      {
        label: "File viewer layout",
        href: "/ui-library/file-viewer/",
        summary:
          "Where an NWB file opens: the overview, the objects and their views.",
      },
      {
        label: "Neurodata object tree",
        href: "/ui-library/object-tree/",
        summary:
          "The Main tab: every object, its type, its views and its description.",
      },
      {
        label: "HDF5 and schema",
        href: "/ui-library/hdf5-schema/",
        summary:
          "The file as stored and the NWB specifications, each with details beside.",
      },
      {
        label: "Time series views",
        href: "/ui-library/time-series/",
        summary:
          "Traces, events and intervals on recording time, and signals aligned to trials.",
      },
      {
        label: "Spike views",
        href: "/ui-library/spike-views/",
        summary: "The raster of spike times, and the PSTH around each trial.",
      },
      {
        label: "Imaging views",
        href: "/ui-library/imaging-views/",
        summary: "Two-photon frames, ROI masks and image collections.",
      },
      {
        label: "Dataset page",
        href: "/ui-library/dataset-page/",
        summary:
          "What a dataset is and its files, for DANDI, EMBER and OpenNeuro.",
      },
      {
        label: "Dataset file viewers",
        href: "/ui-library/dataset-file-viewers/",
        summary:
          "Tables, text, JSON, NIfTI volumes, audio and file information in a dataset.",
      },
      {
        label: "EDF viewer",
        href: "/ui-library/edf-viewer/",
        summary:
          "EDF recordings with channels, separation and the shared time controls.",
      },
      {
        label: "Archive search",
        href: "/ui-library/archive-search/",
        summary: "One search across DANDI, OpenNeuro and EMBER.",
      },
      {
        label: "Home",
        href: "/ui-library/home/",
        summary: "One search, open a file by link, and what was opened last.",
      },
      {
        label: "Guide",
        href: "/ui-library/guide/",
        summary: "The NWB viewer guide, word for word, on Page and Section.",
      },
      {
        label: "Spectrogram",
        href: "/ui-library/spectrogram/",
        summary: "Power by frequency over recording time, and its settings.",
      },
      {
        label: "Intracellular recordings",
        href: "/ui-library/icephys/",
        summary:
          "Patch-clamp sweeps by protocol, overlaid or in panels, and when each was recorded.",
      },
      {
        label: "Video and pose",
        href: "/ui-library/video-and-pose/",
        summary: "Behavioral video, pose markers over it, and linked videos.",
      },
      {
        label: "Neurosift Chat",
        href: "/ui-library/neurosift-chat/",
        summary:
          "The assistant for datasets: today’s chat and a rebuild from @ui.",
      },
      {
        label: "Default object view and Python",
        href: "/ui-library/nwb-object-views/",
        summary:
          "Objects with no view of their own, tables, Load in Python and Timeseries alignment.",
      },
    ],
  },
  {
    heading: "Resources",
    items: [
      {
        label: "Figma library",
        href: "/resources/figma-library/",
        summary: "The Figma file: component frames, variables and pages.",
      },
      {
        label: "Changelog",
        href: "/resources/changelog/",
        summary: "What changed, newest first, in code and in Figma.",
      },
      {
        label: "Contribution guide",
        href: "/resources/contribution-guide/",
        summary: "How a change moves from an idea to a merged pull request.",
      },
      {
        label: "Research and audit",
        href: "/resources/research-and-audit/",
        summary: "Sources, code counts, findings and open questions.",
      },
      {
        label: "Contact the team",
        href: "/resources/contact/",
        summary: "Who to ask about the app, the data and this system.",
      },
    ],
  },
];
