import { FaArrowDown, FaArrowUp, FaRegTimesCircle } from "react-icons/fa";
import { ToolbarItem } from "../../../neurosift-lib/misc/ViewToolbar";

interface AmplitudeScaleToolbarProps {
  ampScaleFactor: number;
  setAmpScaleFactor: (a: number) => void;
}

const AmplitudeScaleToolbarEntries = (
  props: AmplitudeScaleToolbarProps,
): ToolbarItem[] => {
  const { ampScaleFactor, setAmpScaleFactor } = props;

  const _handleScaleAmplitudeUp = () => {
    setAmpScaleFactor(ampScaleFactor * 1.2);
  };
  const _handleScaleAmplitudeDown = () => {
    setAmpScaleFactor(ampScaleFactor / 1.2);
  };
  const _handleResetAmplitude = () => {
    setAmpScaleFactor(1);
  };

  return [
    {
      type: "button",
      callback: _handleScaleAmplitudeUp,
      title: "Scale amplitude up [shift + mouse-wheel]",
      icon: <FaArrowUp />,
      keyCode: 38,
    },
    // {
    //     type: 'button',
    //     callback: _handleResetAmplitude,
    //     title: 'Reset scale amplitude',
    //     icon: <FaRegTimesCircle />
    // },
    {
      type: "button",
      callback: _handleScaleAmplitudeDown,
      title: "Scale amplitude down [shift + mouse-wheel]",
      icon: <FaArrowDown />,
      keyCode: 40,
    },
    // {
    //     type: 'text',
    //     title: 'Amplitude scaling factor',
    //     content: ampScaleFactor,
    //     contentSigFigs: 2
    // }
  ];
};

export default AmplitudeScaleToolbarEntries;
