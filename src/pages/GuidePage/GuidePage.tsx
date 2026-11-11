import type { ReactNode } from "react";
import { CodeBlock, InlineCode, Page, Section } from "@ui";
import "./GuidePage.css";

function Steps({ children }: { children: ReactNode }) {
  return <ol className="guide-list">{children}</ol>;
}

function Topic({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="guide-topic">
      <h3 className="type-label guide-topic-title">{title}</h3>
      {children}
    </div>
  );
}

/** The NWB viewer guide, linked from Home's footer. */
export default function GuidePage() {
  return (
    <Page title="Neurosift Guide">
      <div className="guide type-body">
        <Section title="Overview">
          <p>
            Neurosift is a browser-based tool designed for the visualization of
            NWB (Neurodata Without Borders) files, whether stored locally or
            hosted remotely. It also enables interactive exploration of the{" "}
            <a href="https://dandiarchive.org/">DANDI Archive</a> and{" "}
            <a href="https://openneuro.org/">OpenNeuro</a> (OpenNeuro
            integration is at an early stage).
          </p>
          <p>
            <strong>
              This is the new (next) version of Neurosift. To view the current
              stable version visit{" "}
              <a href="https://neurosift.app">https://neurosift.app</a>
            </strong>
          </p>
        </Section>

        <Section title="Using Neurosift">
          <Topic title="Exploring DANDI Archive">
            <Steps>
              <li>Click on DANDI in the Neurosift home page</li>
              <li>Browse available datasets or use the search functionality</li>
              <li>Select a Dandiset to view its details and files</li>
              <li>Click on any NWB file to visualize its contents</li>
            </Steps>
          </Topic>
          <Topic title="Exploring EMBER Archive">
            <Steps>
              <li>Click on EMBER in the Neurosift home page</li>
              <li>Browse available datasets or use the search functionality</li>
              <li>Select a EMBER Dandiset to view its details and files</li>
              <li>Click on any NWB file to visualize its contents</li>
            </Steps>
          </Topic>
          <Topic title="Using OpenNeuro">
            <p>
              Note: OpenNeuro integration is still at an early stage and does
              not have much functionality yet.
            </p>
            <Steps>
              <li>Click on OpenNeuro in the Neurosift home page</li>
              <li>Browse through available datasets</li>
              <li>Select a dataset to explore its sessions and files</li>
            </Steps>
          </Topic>
          <Topic title="Viewing Remote NWB Files">
            <p>
              To view NWB files hosted on other web servers or cloud storage:
            </p>
            <Steps>
              <li>Ensure your file is hosted with CORS enabled</li>
              <li>
                Use the URL format:{" "}
                <InlineCode>
                  https://neurosift2.vercel.app/nwb?url=YOUR_FILE_URL
                </InlineCode>
              </li>
            </Steps>
            <p>
              You may run into CORS issues if the server hosting the file does
              not allow cross-origin requests. In that case, you must give{" "}
              <a href="https://neurosift2.vercel.app">
                https://neurosift2.vercel.app
              </a>{" "}
              permission to issue GET and HEAD requests to your server.
            </p>
          </Topic>
          <Topic title="Viewing Local Files">
            <p>To view local NWB files directly in your browser:</p>
            <Steps>
              <li>
                Install the neurosift Python package:
                <CodeBlock
                  language="shell"
                  code="pip install --upgrade neurosift"
                />
              </li>
              <li>
                Run the command:
                <CodeBlock
                  language="shell"
                  code="neurosift view-nwb /path/to/file.nwb"
                />
              </li>
              <li>
                This will open Neurosift in your browser with your local file
              </li>
              <li>
                When finished, press Ctrl-C in the terminal to stop the server
              </li>
            </Steps>
            <p>
              <strong>
                Note that this will open the previous version of Neurosift, but
                you can modify the URL accordingly to use this version.
              </strong>
            </p>
          </Topic>
        </Section>

        <Section title="Getting Help">
          <p>If you encounter any issues or have questions:</p>
          <ul className="guide-list">
            <li>
              Visit the{" "}
              <a href="https://github.com/flatironinstitute/neurosift/issues">
                GitHub issue tracker
              </a>{" "}
              to report problems or request features
            </li>
          </ul>
        </Section>
      </div>
    </Page>
  );
}
