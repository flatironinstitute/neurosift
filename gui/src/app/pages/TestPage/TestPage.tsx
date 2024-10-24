/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useEffect } from "react";

type TestPageProps = {
  width: number;
  height: number;
};

const TestPage: FunctionComponent<TestPageProps> = () => {
  return (
    <div style={{ padding: 20 }}>
      <p>TestPage</p>
    </div>
  );
};

export default TestPage;
