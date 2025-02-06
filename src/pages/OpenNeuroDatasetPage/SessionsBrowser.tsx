import {
  FunctionComponent,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";

interface SnapshotFile {
  id: string;
  key: string;
  filename: string;
  directory: boolean;
}

interface QueryResponse {
  data: {
    snapshot: {
      files: SnapshotFile[];
    };
  };
}

type Props = {
  datasetId: string;
  snapshotTag: string;
};

type Subject = {
  subjectId: string;
  treeId: string;
};

type Session = {
  subjectId: string;
  sessionId: string;
  treeId: string;
};

type ExpandedSubjectsState = {
  [subject: string]: boolean;
};

type ExpandedSubjectsAction = {
  type: "toggle";
  subjectId: string;
};

const expandedSubjectsReducer = (
  state: ExpandedSubjectsState,
  action: ExpandedSubjectsAction,
): ExpandedSubjectsState => {
  switch (action.type) {
    case "toggle": {
      const subject = action.subjectId;
      return { ...state, [subject]: !state[subject] };
    }
    default: {
      throw Error("Unexpected action type");
    }
  }
};

const fetchSubjects = async (
  datasetId: string,
  snapshotTag: string,
): Promise<Subject[]> => {
  const query = `query snapshot($datasetId: ID!, $tag: String!) {
    snapshot(datasetId: $datasetId, tag: $tag) {
      files(tree: null) {
        id
        key
        filename
        directory
      }
    }
  }`
    .split("\n")
    .join("\\n");

  const resp = await fetch("https://openneuro.org/crn/graphql", {
    headers: { "content-type": "application/json" },
    body: `{"operationName":"snapshot","variables":{"datasetId":"${datasetId}","tag":"${snapshotTag}"},"query":"${query}"}`,
    method: "POST",
  });

  if (!resp.ok) throw new Error("Failed to fetch OpenNeuro subjects");
  const data = (await resp.json()) as QueryResponse;
  const dirs = data.data.snapshot.files.filter(
    (a: SnapshotFile) => a.directory,
  );
  return dirs.map((a: SnapshotFile) => ({
    subjectId: a.filename,
    treeId: a.id,
  }));
};

const fetchSessions = async (
  datasetId: string,
  snapshotTag: string,
  subject: Subject,
): Promise<Session[]> => {
  const query =
    `query snapshot($datasetId: ID!, $tag: String!, $tree: String!) {
    snapshot(datasetId: $datasetId, tag: $tag) {
      files(tree: $tree) {
        id
        key
        filename
        directory
      }
    }
  }`
      .split("\n")
      .join("\\n");

  const resp = await fetch("https://openneuro.org/crn/graphql", {
    headers: { "content-type": "application/json" },
    body: `{"operationName":"snapshot","variables":{"datasetId":"${datasetId}","tag":"${snapshotTag}","tree":"${subject.treeId}"},"query":"${query}"}`,
    method: "POST",
  });

  if (!resp.ok) throw new Error("Failed to fetch OpenNeuro sessions");
  const data = (await resp.json()) as QueryResponse;
  const dirs = data.data.snapshot.files.filter(
    (a: SnapshotFile) => a.directory,
  );
  return dirs.map((a: SnapshotFile) => ({
    subjectId: subject.subjectId,
    sessionId: a.filename,
    treeId: a.id,
  }));
};

const useSubjects = (datasetId: string, snapshotTag: string) => {
  const [subjects, setSubjects] = useState<Subject[] | undefined>(undefined);

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      setSubjects(undefined);
      const result = await fetchSubjects(datasetId, snapshotTag);
      if (canceled) return;
      setSubjects(result);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [datasetId, snapshotTag]);

  return subjects;
};

type SessionsForSubjects = {
  [subject: string]: Session[];
};

type SessionsForSubjectsAction = {
  type: "set";
  subjectId: string;
  sessions: Session[];
};

const sessionsForSubjectsReducer = (
  state: SessionsForSubjects,
  action: SessionsForSubjectsAction,
): SessionsForSubjects => {
  switch (action.type) {
    case "set":
      return { ...state, [action.subjectId]: action.sessions };
    default:
      throw Error("Unexpected action type");
  }
};

const useSessions = (
  datasetId: string,
  snapshotTag: string,
  subjects: Subject[] | undefined,
  expandedSubjects: ExpandedSubjectsState,
): Session[] => {
  const [sessionsForSubjects, sessionsForSubjectsDispatch] = useReducer(
    sessionsForSubjectsReducer,
    {},
  );

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      for (const subject of subjects || []) {
        if (
          expandedSubjects[subject.subjectId] &&
          !sessionsForSubjects[subject.subjectId]
        ) {
          const sessions = await fetchSessions(datasetId, snapshotTag, subject);
          if (canceled) return;
          sessionsForSubjectsDispatch({
            type: "set",
            subjectId: subject.subjectId,
            sessions,
          });
        }
      }
    };
    load();
    return () => {
      canceled = true;
    };
  }, [datasetId, snapshotTag, subjects, expandedSubjects, sessionsForSubjects]);

  return useMemo(
    () =>
      (subjects || []).reduce((acc, subject) => {
        if (expandedSubjects[subject.subjectId]) {
          return acc.concat(sessionsForSubjects[subject.subjectId] || []);
        }
        return acc;
      }, [] as Session[]),
    [subjects, expandedSubjects, sessionsForSubjects],
  );
};

const SessionsBrowser: FunctionComponent<Props> = ({
  datasetId,
  snapshotTag,
}) => {
  const subjects = useSubjects(datasetId, snapshotTag);
  const [expandedSubjects, expandedSubjectsDispatch] = useReducer(
    expandedSubjectsReducer,
    {},
  );
  const sessions = useSessions(
    datasetId,
    snapshotTag,
    subjects,
    expandedSubjects,
  );

  if (!subjects) return <div>Loading subjects...</div>;

  return (
    <div style={{ marginTop: "20px" }}>
      {subjects.map((subject) => (
        <div key={subject.subjectId}>
          <div
            style={{
              fontSize: 16,
              fontWeight: "bold",
              padding: 10,
              cursor: "pointer",
              backgroundColor: "#f5f5f5",
              borderRadius: 4,
              marginBottom: 2,
              display: "flex",
              alignItems: "center",
            }}
            onClick={() =>
              expandedSubjectsDispatch({
                type: "toggle",
                subjectId: subject.subjectId,
              })
            }
          >
            <span style={{ marginRight: 8 }}>
              {expandedSubjects[subject.subjectId] ? "▼" : "▶"}
            </span>
            {subject.subjectId}
          </div>
          {expandedSubjects[subject.subjectId] && (
            <div style={{ padding: "0 20px", marginBottom: 10 }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                }}
              >
                <tbody>
                  {sessions
                    .filter(
                      (session) => session.subjectId === subject.subjectId,
                    )
                    .map((session) => (
                      <tr
                        key={`${session.subjectId}/${session.sessionId}`}
                        style={{ borderBottom: "1px solid #eee" }}
                      >
                        <td style={{ padding: "8px 0" }}>
                          {session.sessionId}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default SessionsBrowser;
