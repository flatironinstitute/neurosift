import { FunctionComponent } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Select,
  MenuItem,
  Button,
  Box,
  FormControl,
  InputLabel,
} from "@mui/material";

export type SpikeSortingParams = {
  startTime: number;
  endTime: number;
  channelString: string;
  algorithm: string;
  detectThreshold: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (params: SpikeSortingParams) => void;
  defaultStartTime: number;
  defaultEndTime: number;
};

const SpikeSortingDialog: FunctionComponent<Props> = ({
  open,
  onClose,
  onSubmit,
  defaultStartTime,
  defaultEndTime,
}) => {
  // Initial values for the form
  const initialParams: SpikeSortingParams = {
    startTime: defaultStartTime,
    endTime: defaultEndTime,
    channelString: "*",
    algorithm: "mountainsort5",
    detectThreshold: 5,
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const params: SpikeSortingParams = {
      startTime: parseFloat(formData.get("startTime") as string),
      endTime: parseFloat(formData.get("endTime") as string),
      channelString: formData.get("channelString") as string,
      algorithm: formData.get("algorithm") as string,
      detectThreshold: parseFloat(formData.get("detectThreshold") as string),
    };

    onSubmit(params);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Launch Spike Sorting</DialogTitle>
      <DialogContent>
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            mt: 1,
          }}
        >
          <TextField
            name="startTime"
            label="Start Time (seconds)"
            type="number"
            defaultValue={initialParams.startTime}
            required
            inputProps={{ step: "any" }}
          />
          <TextField
            name="endTime"
            label="End Time (seconds)"
            type="number"
            defaultValue={initialParams.endTime}
            required
            inputProps={{ step: "any" }}
          />
          <TextField
            name="channelString"
            label="Channels (e.g. 1-10,15,20-25)"
            defaultValue={initialParams.channelString}
            required
            helperText="Use ranges like '1-10' or individual channels like '1,5,10'"
          />
          <FormControl>
            <InputLabel>Algorithm</InputLabel>
            <Select
              name="algorithm"
              defaultValue={initialParams.algorithm}
              label="Algorithm"
              required
            >
              <MenuItem value="mountainsort5">MountainSort 5</MenuItem>
            </Select>
          </FormControl>
          <TextField
            name="detectThreshold"
            label="Detection Threshold"
            type="number"
            defaultValue={initialParams.detectThreshold}
            required
            inputProps={{ step: "any" }}
          />
          <Box
            sx={{
              display: "flex",
              gap: 1,
              justifyContent: "flex-end",
              mt: 2,
            }}
          >
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="contained">
              Start Spike Sorting
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default SpikeSortingDialog;
