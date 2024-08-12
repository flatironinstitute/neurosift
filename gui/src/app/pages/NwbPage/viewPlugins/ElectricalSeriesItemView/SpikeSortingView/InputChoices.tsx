import { FunctionComponent } from "react";

export type InputChoicesProps = {
  value: number | string;
  choices: (number | string)[];
  onChange: (value: number | string) => void;
};

const InputChoices: FunctionComponent<InputChoicesProps> = ({
  value,
  choices,
  onChange,
}) => {
  const valFromStr = (str: string) => {
    const i = choices.map((x) => x.toString()).indexOf(str);
    if (i < 0) {
      throw Error(`Unexpected: value not found in choices: ${str}`);
    }
    return choices[i];
  };
  return (
    <select
      value={value}
      onChange={(e) => onChange(valFromStr(e.target.value))}
    >
      {choices.map((choice) => (
        <option key={choice} value={choice}>
          {choice}
        </option>
      ))}
    </select>
  );
};

export default InputChoices;
