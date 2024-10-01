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
  const [responseGptModel, setResponseGptModel] = useState("");
  const [response, setResponse] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const W = width / 2;
  return (
    <div style={{ position: "absolute", top: 0, left: 0, width, height }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height }}>
        <InputWindow
          submitting={submitting}
          setSubmitting={setSubmitting}
          setResponse={setResponse}
          setResponseGptModel={setResponseGptModel}
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
        {submitting && <div>Submitting...</div>}
        {!submitting && (
          <>
            {responseGptModel === "prompt" ? (
              <OutputPromptWindow
                response={response}
                width={width - W}
                height={height}
              />
            ) : (
              <OutputWindow
                response={response}
                width={width - W}
                height={height}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

type InputWindowProps = {
  setResponse: (response: string) => void;
  setResponseGptModel: (gptModel: string) => void;
  submitting: boolean;
  setSubmitting: (submitting: boolean) => void;
  nwbFile: RemoteH5FileX;
  width: number;
  height: number;
};

const promptChoices = [
  {
    label: "overview",
    prompt:
      "Provide a detailed overview of this experiment in narrative form drawing on both the metadata and the data in this NWB file.",
  },
  {
    label: "purpose",
    prompt:
      "Given the information in the file, what do you think is the purpose of this experiment?",
  },
  {
    label: "data",
    prompt: "Provide a detailed overview of the data in this NWB file.",
  },
];

const InputWindow: FunctionComponent<InputWindowProps> = ({
  submitting,
  setSubmitting,
  setResponse,
  setResponseGptModel,
  nwbFile,
  width,
  height,
}) => {
  const [client, setClient] = useState<NwbchatClient | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [gptModel, setGptModel] = useState("gpt-4o");
  const [fullPrompt, setFullPrompt] = useState("");
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
      const {
        response: r,
        estimatedCost,
        fullPrompt,
      } = await client.chatQuery(prompt, nwbFileInfo, gptModel);
      setResponse(r);
      setResponseGptModel(gptModel);
      setEstimatedCost(estimatedCost);
      setFullPrompt(fullPrompt);
    } catch (e: any) {
      setErrorMessage(e.message);
    } finally {
      setSubmitting(false);
    }
  }, [
    client,
    prompt,
    nwbFileInfo,
    gptModel,
    setResponse,
    setResponseGptModel,
    setSubmitting,
  ]);
  useEffect(() => {
    console.info("FULL PROMPT");
    console.info(fullPrompt);
  }, [fullPrompt]);
  const numRequestsPerDollar = estimatedCost ? 1 / estimatedCost : 0;
  const submitEnabled = !!client && !!nwbFileInfo && !submitting && !!prompt;
  const topBarHeight = 50;
  const bottomBarHeight = 50;
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
          }}
        >
          <div style={{ fontWeight: "bold" }}>
            Provide a prompt to get information about this NWB file
          </div>
          <div style={{ marginTop: 8 }}>
            Predefined prompts:{" "}
            {promptChoices.map((x) => (
              <>
                <button key={x.label} onClick={() => setPrompt(x.prompt)}>
                  {x.label}
                </button>
                &nbsp;
              </>
            ))}
          </div>
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
                {errorMessage && (
                  <span style={{ color: "red" }}>{errorMessage}</span>
                )}
                {numRequestsPerDollar ? (
                  <>
                    Estimated cost based on last request: one doller per{" "}
                    {numRequestsPerDollar.toFixed(0)} requests
                  </>
                ) : (
                  <></>
                )}
              </span>
            )}
          </div>
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

const gptModelChoices = ["gpt-4o-mini", "gpt-4o", "prompt"];

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

type OutputPromptWindowProps = {
  response: string;
  width: number;
  height: number;
};

const OutputPromptWindow: FunctionComponent<OutputPromptWindowProps> = ({
  response,
  width,
  height,
}) => {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    setCopied(false);
  }, [response]);
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
      <div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(response);
            setCopied(true);
          }}
        >
          copy prompt
        </button>
        &nbsp;
        {copied && <span>Copied</span>}
      </div>
      <div>
        <pre>{response}</pre>
      </div>
    </div>
  );
};

export default InfoView;
