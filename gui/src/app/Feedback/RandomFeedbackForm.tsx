import ModalWindow, { useModalWindow } from "@fi-sci/modal-window";
import { FunctionComponent, useCallback, useEffect, useState } from "react";

type RandomFeedbackFormProps = {
  // none
};

const specialCode = "3363";
const enteredSpecialCode = localStorage.getItem("enteredSpecialCode") || "";

const NUM = 12;

let showIt = false;
const numPageViewsSinceLastFeedbackString =
  localStorage.getItem("numPageViewsSinceLastFeedback") || "";
let numPageViewsSinceLastFeedback = parseInt(
  numPageViewsSinceLastFeedbackString,
);
numPageViewsSinceLastFeedback = isNaN(numPageViewsSinceLastFeedback)
  ? 0
  : numPageViewsSinceLastFeedback;
numPageViewsSinceLastFeedback++;
localStorage.setItem(
  "numPageViewsSinceLastFeedback",
  numPageViewsSinceLastFeedback.toString(),
);
if (
  numPageViewsSinceLastFeedback >= NUM &&
  enteredSpecialCode !== specialCode
) {
  showIt = true;
  localStorage.setItem("numPageViewsSinceLastFeedback", "0");
}

const RandomFeedbackForm: FunctionComponent<RandomFeedbackFormProps> = () => {
  const { visible, handleClose, handleOpen } = useModalWindow();
  useEffect(() => {
    if (showIt) {
      handleOpen();
    }
  }, [handleOpen]);
  if (!showIt) return <></>;

  return (
    <ModalWindow visible={visible} onClose={handleClose}>
      <Feedback onClose={handleClose} />
    </ModalWindow>
  );
};

const Feedback: FunctionComponent<{ onClose: () => void }> = ({ onClose }) => {
  const [code, setCode] = useState("");
  const handleSubmit = useCallback(() => {
    if (code === specialCode) {
      localStorage.setItem("enteredSpecialCode", specialCode);
      onClose();
    }
  }, [code, onClose]);
  return (
    <div>
      <h3>Neurosift feedback</h3>
      <p>
        Neurosift is under active development and we would love your feedback to
        help guide this project.
      </p>
      <p>
        Please let us know what you think by filling out our{" "}
        <a
          href="https://forms.gle/8YrNf1Tnz4685TMY9"
          target="_blank"
          rel="noreferrer"
        >
          feedback form
        </a>
        .
      </p>
      <p>
        To prevent this message from appearing again, enter the code you see at
        the end of the feedback form:{" "}
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        &nbsp;
        <button onClick={handleSubmit}>Submit</button>
      </p>
      <button onClick={onClose}>Close</button>
    </div>
  );
};

export default RandomFeedbackForm;
