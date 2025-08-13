import { JobStatusHandler } from "@jobManager/components/JobStatusHandler";
import { useNeurosiftJob } from "@jobManager/useNeurosiftJob";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import { FunctionComponent, useMemo, useState } from "react";

export type Mountainsort5Params = {
  zarrUrl: string;
  ecephysPath: string;
  startTime: number;
  endTime: number;
  channelString: string;
  detectThreshold: number;
};

interface SpikeSortingResult {
  output_url?: string;
  // Add other result properties as needed
}

type Props = {
  open: boolean;
  onClose: () => void;
  zarrUrl: string;
  ecephysPath: string;
  defaultStartTime: number;
  defaultEndTime: number;
};

const SpikeSortingDialog: FunctionComponent<Props> = ({
  open,
  onClose,
  zarrUrl,
  ecephysPath,
  defaultStartTime,
  defaultEndTime,
}) => {
  const [startTime, setStartTime] = useState<number>(defaultStartTime);
  const [endTime, setEndTime] = useState<number>(defaultEndTime);
  const [channelString, setChannelString] = useState<string>("*");
  const [detectThreshold, setDetectThreshold] = useState<number>(5);

  const jobInput = useMemo<Mountainsort5Params>(
    () => ({
      zarrUrl,
      ecephysPath,
      startTime,
      endTime,
      channelString,
      detectThreshold,
    }),
    [zarrUrl, ecephysPath, startTime, endTime, channelString, detectThreshold],
  );

  const job = useNeurosiftJob<Mountainsort5Params, SpikeSortingResult>(
    "mountainsort5",
    jobInput,
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Launch Spike Sorting</DialogTitle>
      <DialogContent>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            mt: 1,
          }}
        >
          <TextField
            label="Start Time (seconds)"
            type="number"
            value={startTime}
            onChange={(e) => setStartTime(Number(e.target.value))}
            inputProps={{ step: "any" }}
          />
          <TextField
            label="End Time (seconds)"
            type="number"
            value={endTime}
            onChange={(e) => setEndTime(Number(e.target.value))}
            inputProps={{ step: "any" }}
          />
          <TextField
            label="Channels (e.g. 1-10,15,20-25)"
            value={channelString}
            onChange={(e) => setChannelString(e.target.value)}
            helperText="Use ranges like '1-10' or individual channels like '1,5,10'"
          />
          <TextField
            label="Detection Threshold"
            type="number"
            value={detectThreshold}
            onChange={(e) => setDetectThreshold(Number(e.target.value))}
            inputProps={{ step: "any" }}
          />

          <JobStatusHandler
            job={job.job}
            error={job.error}
            isRefreshing={job.isRefreshing}
            onSubmit={job.submitJob}
            onRefresh={job.fetchJobStatus}
            onCancel={job.cancelJob}
            onDelete={job.deleteJob}
            jobLabel="Mountainsort5 Spike Sorting"
            imageName="neurosift-job-runner-3"
          />

          <Box
            sx={{
              display: "flex",
              gap: 1,
              justifyContent: "flex-end",
              mt: 2,
            }}
          >
            <Button onClick={onClose}>Close</Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default SpikeSortingDialog;
