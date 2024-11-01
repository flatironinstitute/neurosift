import { FunctionComponent, useCallback, useEffect } from "react";

import { KernelManager, ServerConnection } from "@jupyterlab/services";

type TestPageProps = {
  width: number;
  height: number;
};

const TestPage: FunctionComponent<TestPageProps> = ({ width, height }) => {
  const test = useCallback(() => {
    doTest();
  }, []);
  return (
    <div>
      <h1>Test Page</h1>
      <div>
        <button onClick={test}>Run Test</button>
      </div>
    </div>
  );
};

const doTest = async () => {
  const serverSettings = ServerConnection.makeSettings({
    baseUrl: "http://localhost:8888",
  });
  const kernelManager = new KernelManager({ serverSettings });
  const kernel = await kernelManager.startNew({
    name: "python",
  });
  kernel.statusChanged.connect((_, status) => {
    console.log("status", status);
  });
  kernel.iopubMessage.connect((_, msg) => {
    console.log(JSON.stringify(msg.content));
  });
  const code = `
import matplotlib.pyplot as plt
import numpy as np
x = np.linspace(0, 10, 100)
y = np.sin(x)
plt.plot(x, y)
plt.show()
`;
  const future = kernel.requestExecute({ code });
  const reply = await future.done;
  console.log(reply);

  await kernel.shutdown();
};

export default TestPage;
