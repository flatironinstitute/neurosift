/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useCallback, useEffect } from "react";
import {
  RemoteH5File,
  getRemoteH5File,
  RemoteH5FileLindi,
  getRemoteH5FileLindi,
} from "@remote-h5-file/index";
import { useContextChat } from "app/ContextChat/ContextChat";

type TestPageProps = {
  width: number;
  height: number;
};

const TestPage: FunctionComponent<TestPageProps> = () => {
  const { setContextItem } = useContextChat();
  useEffect(() => {
    const x = `
If the user asks questions about pynapple, refer them to the following resources. Refer to as many as are relevant to the user's question.

[tutorial_pynapple_core](https://github.com/pynapple-org/pynapple/blob/main/docs/api_guide/tutorial_pynapple_core.py): This script will introduce the basics of handling time series data with pynapple.

[tutorial_pynapple_filtering.py](https://github.com/pynapple-org/pynapple/blob/main/docs/api_guide/tutorial_pynapple_filtering.py):
The filtering module holds the functions for frequency manipulation :
- nap.apply_bandstop_filter
- nap.apply_lowpass_filter
- nap.apply_highpass_filter
- nap.apply_bandpass_filter

[tutorial_pynapple_io.py](https://github.com/pynapple-org/pynapple/blob/main/docs/api_guide/tutorial_pynapple_io.py):
This notebook is designed to demonstrate the pynapple IO. It is build around the specifications of the [BIDS standard](https://bids-standard.github.io/bids-starter-kit/index.html) for sharing datasets.


[tutorial_pynapple_numpy.py](https://github.com/pynapple-org/pynapple/blob/main/docs/api_guide/tutorial_pynapple_numpy.py):
This tutorial shows how pynapple interact with numpy.

[tutorial_pynapple_nwb.py](https://github.com/pynapple-org/pynapple/blob/main/docs/api_guide/tutorial_pynapple_nwb.py):
Pynapple currently provides loaders for two data formats: npz and NWB. This notebook focuses on the NWB format.

[tutorial_pynapple_process.py](https://github.com/pynapple-org/pynapple/blob/main/docs/api_guide/tutorial_pynapple_process.py):
The pynapple package provides a small set of high-level functions that are widely used in systems neuroscience.
- Discrete correlograms
- Tuning curves
- Decoding
- PETH
- Randomization
This notebook provides few examples with artificial data.

[tutorial_pynapple_quick_start.py](https://github.com/pynapple-org/pynapple/blob/main/docs/api_guide/tutorial_pynapple_quick_start.py):
This notebook is meant to provide an overview of pynapple by going through: IO, Core functions, Process functions

[tutorial_pynapple_spectrum.py](https://github.com/pynapple-org/pynapple/blob/main/docs/api_guide/tutorial_pynapple_spectrum.py):
Power spectral density

[tutorial_pynapple_wavelets.py](https://github.com/pynapple-org/pynapple/blob/main/docs/api_guide/tutorial_pynapple_wavelets.py):
This tutorial covers the use of nap.compute_wavelet_transform to do continuous wavelet transform. By default, pynapple uses Morlet wavelets.
`;
    setContextItem("test-page", { content: x });
  }, [setContextItem]);
  return (
    <div style={{ padding: 20 }}>
      <p>
        Testing chatbot. Open the chatbot and ask questions about using
        pynapple.
      </p>
    </div>
  );
};

export default TestPage;
