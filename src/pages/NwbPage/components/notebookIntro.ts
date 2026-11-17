/** The notebook's opening line: what it loads, and a link back to the Neurosift view it came from. */
export const notebookIntro = (file: string, tools = "PyNWB and LINDI") =>
  `Loads \`${file}\` with ${tools}, streaming it from the archive. Made from [this view in Neurosift](${window.location.href}).`;
