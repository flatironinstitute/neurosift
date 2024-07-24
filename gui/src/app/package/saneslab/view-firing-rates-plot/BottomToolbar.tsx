import {
  createTheme,
  FormControl,
  MenuItem,
  Select,
  Slider,
  ThemeProvider,
} from "@mui/material";
import { FunctionComponent } from "react";

type Props = {
  actions: Action[];
};

export type Action =
  | {
      type: "select";
      label: string;
      choices: {
        key: string | number;
        label: string | number;
      }[];
      value: string | number;
      onChange: (v: string | number) => void;
    }
  | {
      type: "slider";
      label: string;
      min: number;
      max: number;
      step: number;
      value: number;
      onChange: (v: number) => void;
    };

const BottomToolbar: FunctionComponent<Props> = ({ actions }) => {
  return (
    <div>
      {actions.map((action, ii) => (
        <span key={ii}>
          <span>&nbsp;&nbsp;&nbsp;</span>
          {action.type === "select" ? (
            <SelectAction action={action} />
          ) : action.type === "slider" ? (
            <SliderAction action={action} />
          ) : (
            <span />
          )}
        </span>
      ))}
    </div>
  );
};

const theme = createTheme({
  components: {
    MuiSelect: {
      styleOverrides: {
        select: {
          paddingTop: 0,
          paddingBottom: 0,
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          paddingTop: 5,
          marginLeft: 10,
        },
      },
    },
  },
});

const SelectAction: FunctionComponent<{
  action: Action & { type: "select" };
}> = ({ action }) => {
  return (
    <span>
      {action.label && (
        <span style={{ bottom: -3, position: "relative" }}>
          {action.label}&nbsp;
        </span>
      )}
      <ThemeProvider theme={theme}>
        <FormControl size="small">
          <Select
            style={{ paddingTop: 0, paddingBottom: 0 }}
            value={action.value + ""}
            onChange={(e) => {
              action.onChange(parseFloat(e.target.value as string));
            }}
          >
            {action.choices.map((choice) => (
              <MenuItem key={choice.key} value={choice.key + ""}>
                {choice.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </ThemeProvider>
    </span>
  );
};

const SliderAction: FunctionComponent<{
  action: Action & { type: "slider" };
}> = ({ action }) => {
  return (
    <span>
      {action.label && (
        <span style={{ bottom: -3, position: "relative" }}>
          {action.label}&nbsp;
        </span>
      )}
      <ThemeProvider theme={theme}>
        <FormControl size="small">
          <Slider
            min={action.min}
            max={action.max}
            step={action.step}
            style={{ width: 300 }}
            value={action.value}
            onChange={(e, v) => action.onChange(v as number)}
          />
        </FormControl>
      </ThemeProvider>
    </span>
  );
};

export default BottomToolbar;
