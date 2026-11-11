import { InlineMessage } from "@ui";
import "./FramesNote.css";

interface FramesNoteProps {
  loaded: number;
  total: number;
}

/** Niivue loads the first few frames of a 4D image; this says so until the rest are loaded. */
const FramesNote = ({ loaded, total }: FramesNoteProps) => {
  if (loaded >= total) return null;
  return (
    <div className="frames-note">
      <InlineMessage status="info">
        Showing the first {loaded} of {total} frames, since 4D images are slow
        to load. Click … under the graph to load them all.
      </InlineMessage>
    </div>
  );
};

export default FramesNote;
