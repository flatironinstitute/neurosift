import Markdown from "neurosift-lib/components/Markdown";
import useRoute, { Route } from "neurosift-lib/contexts/useRoute";
import { FunctionComponent } from "react";

type Props = {
  width: number;
  height: number;
};

const md = `
# Welcome to Neurosift

Neurosift is a browser-based tool designed for the
visualization and processing of NWB (Neurodata Without Borders) files,
whether stored locally or hosted remotely,
and enables interactive exploration and analysis of the DANDI Archive.

You can use Neurosift to:

* [Browse DANDI Archive](?/p=dandi)
* [Visualize NWB files - remote or local](https://magland.github.io/neurosift-blog/talks/neurosift_INCF_assembly_sep_2024)
* See the blog for other capabilities...


## Learn more or get help

- [GitHub repository](https://github.com/flatironinstitute/neurosift)
- [Neurosift blog](https://magland.github.io/neurosift-blog/)
- [Request a feature or report a bug](https://github.com/flatironinstitute/neurosift/issues)
- [Feedback form](https://forms.gle/8YrNf1Tnz4685TMY9")

## Follow us

If you find this project useful in your research, please
[star us on GitHub](https://github.com/flatironinstitute/neurosift)
or [follow us on Bluesky](https://bsky.app/profile/neurosift.app).
`;

const HomePage: FunctionComponent<Props> = ({ width, height }) => {
  const { setRoute } = useRoute();
  // layout
  const chatAreaWidth = Math.min(width - 30, 800);
  const offsetLeft = (width - chatAreaWidth) / 2;
  return (
    <div
      style={{
        position: "absolute",
        left: offsetLeft,
        width: chatAreaWidth,
        top: 0,
        height: height,
        overflow: "auto",
      }}
    >
      <Markdown
        source={md}
        onSpecialLinkClick={(link) => {
          const r = parseSpecialLink(link);
          if (!r) return;
          setRoute(r);
        }}
        linkTarget="_self"
      />
    </div>
  );
};

const parseSpecialLink = (link: string): Route | null => {
  if (link === "?/p=dandi") {
    return { page: "dandi" };
  } else if (link === "?/p=chat") {
    return { page: "chat" };
  }
  return null;
};

export default HomePage;
