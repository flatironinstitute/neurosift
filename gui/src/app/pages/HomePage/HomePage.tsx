import { Hyperlink, SmallIconButton } from "@fi-sci/misc";
import { FunctionComponent } from "react";
import { FaGithub } from "react-icons/fa";
import useRoute from "neurosift-lib/contexts/useRoute";

type Props = {
  width: number;
  height: number;
};

const HomePage: FunctionComponent<Props> = ({ width, height }) => {
  const { setRoute } = useRoute();
  return (
    <div style={{ padding: 20, maxWidth: 800 }}>
      <h2>Welcome to Neurosift</h2>
      <p>
        Neurosift is a browser-based tool designed for the visualization and
        processing of NWB (Neurodata Without Borders) files, whether stored
        locally or hosted remotely, and enables interactive exploration and
        analysis of the DANDI Archive.
      </p>
      <p>
        <Hyperlink href="https://magland.github.io/neurosift-blog/workshop">
          ** Register for the online workshop **
        </Hyperlink>
      </p>
      <p>
        <a
          href="https://magland.github.io/neurosift-blog/"
          target="_blank"
          rel="noreferrer"
        >
          Neurosift Blog
        </a>
      </p>
      <p>
        <Hyperlink href="https://github.com/flatironinstitute/neurosift">
          Source repository <FaGithub />
        </Hyperlink>
      </p>
      <p>
        Fill out our{" "}
        <a
          href="https://forms.gle/8YrNf1Tnz4685TMY9"
          target="_blank"
          rel="noreferrer"
        >
          feedback form
        </a>
      </p>
      <hr />
      {/* <p>
        <Hyperlink href="https://github.com/flatironinstitute/neurosift/blob/main/changelog.md">
          CHANGELOG
        </Hyperlink>
      </p> */}
      <p>
        <Hyperlink href="https://github.com/flatironinstitute/neurosift/issues">
          Request a feature or report a bug
        </Hyperlink>
      </p>
      <hr />
      <p>
        If you find this project useful in your research, please{" "}
        <Hyperlink href="https://github.com/flatironinstitute/neurosift">
          star us on GitHub
        </Hyperlink>
        &nbsp; and{" "}
        <Hyperlink href="https://bsky.app/profile/neurosift.app">
          follow us on Bluesky
        </Hyperlink>
        .
      </p>
    </div>
  );
};

export default HomePage;
