import { RemoteH5FileX } from "@remote-h5-file/index";
import Markdown from "app/Markdown/Markdown";
import { NwbFileInfo } from "NwbchatClient/nwbchat-types";
import { NwbchatClient } from "NwbchatClient/NwbchatClient";
import { FunctionComponent, useCallback, useEffect, useState } from "react";
import getNwbFileInfo from "./getNwbFileInfo";

type InfoViewProps = {
  width: number;
  height: number;
  nwbFile: RemoteH5FileX;
};

const InfoView: FunctionComponent<InfoViewProps> = ({
  width,
  height,
  nwbFile,
}) => {
  const [response, setResponse] = useState<string>("");
  const W = width / 2;
  return (
    <div style={{ position: "absolute", top: 0, left: 0, width, height }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height }}>
        <InputWindow
          response={response}
          setResponse={setResponse}
          nwbFile={nwbFile}
          width={W}
          height={height}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: W,
          top: 0,
          width: width - W,
          height,
        }}
      >
        <OutputWindow response={response} width={width - W} height={height} />
      </div>
    </div>
  );
};

type InputWindowProps = {
  response: string;
  setResponse: (response: string) => void;
  nwbFile: RemoteH5FileX;
  width: number;
  height: number;
};

const defaultPrompt =
  "Describe the experiment and data available in this NWB file.";

const InputWindow: FunctionComponent<InputWindowProps> = ({
  response,
  setResponse,
  nwbFile,
  width,
  height,
}) => {
  const [client, setClient] = useState<NwbchatClient | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [gptModel, setGptModel] = useState("gpt-4o-mini");
  const nwbFileInfo = useNwbFileInfo(nwbFile);
  useEffect(() => {
    (async () => {
      const client = new NwbchatClient({ verbose: true });
      setClient(client);
    })();
  }, []);
  const handleSubmit = useCallback(async () => {
    if (!client) return;
    if (!nwbFileInfo) return;
    setSubmitting(true);
    setErrorMessage("");
    try {
      const { response: r, estimatedCost } = await client.chatQuery(
        prompt,
        nwbFileInfo,
        gptModel,
      );
      setResponse(r);
      setEstimatedCost(estimatedCost);
    } catch (e: any) {
      setErrorMessage(e.message);
    } finally {
      setSubmitting(false);
    }
  }, [client, prompt, nwbFileInfo, gptModel, setResponse]);
  const numRequestsPerDollar = estimatedCost ? 1 / estimatedCost : 0;
  const submitEnabled = !!client && !!nwbFileInfo && !submitting;
  const topBarHeight = 30;
  const bottomBarHeight = 80;
  const inputHeight = height - topBarHeight - bottomBarHeight;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width, height }}>
      <div>
        <div
          style={{
            position: "absolute",
            left: 10,
            top: 10,
            width,
            height: topBarHeight,
            fontWeight: "bold",
          }}
        >
          Provide a prompt to get information about this NWB file:
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: topBarHeight,
            width,
            height: inputHeight,
          }}
        >
          <div style={{ padding: 10 }}>
            <textarea
              style={{ width: width - 20, height: inputHeight - 20 }}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value || "");
              }}
              disabled={submitting}
            />
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: topBarHeight + inputHeight,
            width,
            height: bottomBarHeight,
          }}
        >
          <div style={{ paddingLeft: 10 }}>
            <GptModelSelector
              value={gptModel}
              onChange={setGptModel}
              disabled={submitting}
            />
            &nbsp;
            <button onClick={handleSubmit} disabled={!submitEnabled}>
              Submit
            </button>
          </div>
          <div style={{ paddingLeft: 10 }}>
            {!submitting && (
              <span>
                Estimated pricing based on last request:{" "}
                {numRequestsPerDollar.toFixed(2)} requests per dollar
              </span>
            )}
          </div>
          <div style={{ padding: 20 }}>
            {errorMessage && (
              <span style={{ color: "red" }}>{errorMessage}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
  return (
    <div style={{ padding: 20 }}>
      <div>
        <div>
          <textarea
            style={{ width: "100%", height: "200px" }}
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value || "");
            }}
            disabled={submitting}
          />
        </div>
        <div>
          <GptModelSelector
            value={gptModel}
            onChange={setGptModel}
            disabled={submitting}
          />
        </div>
        <div>
          <button onClick={handleSubmit} disabled={!submitEnabled}>
            Submit
          </button>
        </div>
        <div>
          {errorMessage && <span style={{ color: "red" }}>{errorMessage}</span>}
        </div>
        <div>
          {!submitting && (
            <span>
              Estimated pricing based on last request:{" "}
              {numRequestsPerDollar.toFixed(2)} requests per dollar
            </span>
          )}
        </div>
        <div>
          <Markdown source={response} />
        </div>
      </div>
    </div>
  );
};

type OutputWindowProps = {
  response: string;
  width: number;
  height: number;
};

const OutputWindow: FunctionComponent<OutputWindowProps> = ({
  response,
  width,
  height,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        left: 20,
        top: 20,
        width: width - 40,
        height: height - 40,
        overflowY: "auto",
      }}
    >
      <Markdown source={response} />
    </div>
  );
};

const gptModelChoices = ["gpt-4o-mini", "gpt-4o"];

type GptModelSelectorProps = {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
};

const GptModelSelector: FunctionComponent<GptModelSelectorProps> = ({
  value,
  onChange,
  disabled,
}) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      {gptModelChoices.map((x) => (
        <option key={x} value={x}>
          {x}
        </option>
      ))}
    </select>
  );
};

const useNwbFileInfo = (nwbFile: RemoteH5FileX): NwbFileInfo | undefined => {
  const [nwbFileInfo, setNwbFileInfo] = useState<NwbFileInfo | undefined>(
    undefined,
  );

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const x = await getNwbFileInfo(nwbFile);
        if (canceled) return;
        setNwbFileInfo(x);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [nwbFile]);

  return nwbFileInfo;
};

export default InfoView;
