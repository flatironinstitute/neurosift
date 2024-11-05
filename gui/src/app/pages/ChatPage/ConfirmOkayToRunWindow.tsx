import { SmallIconButton } from "@fi-sci/misc";
import { Cancel, Check } from "@mui/icons-material";
import Markdown from "app/Markdown/Markdown";
import { FunctionComponent } from "react";

type ConfirmOkayToRunWindowProps = {
  script: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmOkayToRunWindow: FunctionComponent<
  ConfirmOkayToRunWindowProps
> = ({ script, onConfirm, onCancel }) => {
  return (
    <div style={{ padding: 20 }}>
      <p>
        The agent would like to run the following script on your Jupyter runtime
        kernel. Are you okay with this?
      </p>
      <div>
        <SmallIconButton
          icon={<Check />}
          onClick={onConfirm}
          title="Confirm"
          label="Confirm"
        />
        &nbsp;&nbsp;&nbsp;
        <SmallIconButton
          icon={<Cancel />}
          onClick={onCancel}
          title="Cancel"
          label="Cancel"
        />
      </div>
      <div>
        <Markdown source={`\`\`\`python\n${script}\n\`\`\``} />
      </div>
    </div>
  );
};

export default ConfirmOkayToRunWindow;
