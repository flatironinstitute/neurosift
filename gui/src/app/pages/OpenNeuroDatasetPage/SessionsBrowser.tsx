import { Hyperlink } from "@fi-sci/misc";
import {
  FunctionComponent,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";

type SessionsBrowserProps = {
  datasetId: string;
  snapshotTag: string;
  onClickSession: (session: Session) => void;
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

const SessionsBrowser: FunctionComponent<SessionsBrowserProps> = ({
  datasetId,
  snapshotTag,
  onClickSession,
}) => {
  const subjects: Subject[] | undefined = useSubjects(datasetId, snapshotTag);

  const [expandedSubjects, expandedSubjectsDispatch] = useReducer(
    expandedSubjectsReducer,
    {},
  );

  const sessions: Session[] = useSessions(
    datasetId,
    snapshotTag,
    subjects,
    expandedSubjects,
  );

  if (!subjects) return <div>Loading subjects...</div>;
  return (
    <div>
      {subjects.map((subject) => (
        <div key={subject.subjectId}>
          <div
            style={{
              fontSize: 18,
              fontWeight: "bold",
              padding: 5,
              cursor: "pointer",
            }}
            onClick={() =>
              expandedSubjectsDispatch({
                type: "toggle",
                subjectId: subject.subjectId,
              })
            }
          >
            {expandedSubjects[subject.subjectId] ? "▼" : "▶"}
            &nbsp;&nbsp;
            {subject.subjectId}
          </div>
          <div style={{ padding: 5 }}>
            {expandedSubjects[subject.subjectId] && (
              <SessionsTable
                sessions={sessions.filter(
                  (session) => session.subjectId === subject.subjectId,
                )}
                onClickSession={onClickSession}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

type SessionsTableProps = {
  sessions: Session[];
  onClickSession: (session: Session) => void;
};

const SessionsTable: FunctionComponent<SessionsTableProps> = ({
  sessions,
  onClickSession,
}) => {
  return (
    <table className="nwb-table">
      <thead></thead>
      <tbody>
        {sessions.map((session) => (
          <SessionRow
            key={session.subjectId + "/" + session.sessionId}
            session={session}
            onClick={onClickSession ? () => onClickSession(session) : undefined}
          />
        ))}
      </tbody>
    </table>
  );
};

type SessionRowProps = {
  session: Session;
  onClick?: () => void;
};

const SessionRow: FunctionComponent<SessionRowProps> = ({
  session,
  onClick,
}) => {
  const { sessionId } = session;

  return (
    <tr>
      <td>
        {onClick ? (
          <Hyperlink onClick={onClick}>{sessionId}</Hyperlink>
        ) : (
          sessionId
        )}
      </td>
      {/* <td>{formatTime2(modified)}</td>
      <td>{formatByteCount(size)}</td> */}
    </tr>
  );
};

// const formatTime2 = (time: string) => {
//   const date = new Date(time);
//   // include date only
//   return date.toLocaleDateString();
// };

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
) => {
  switch (action.type) {
    case "toggle": {
      const subject = action.subjectId;
      const newState = { ...state };
      newState[subject] = !newState[subject];
      return newState;
    }
    default: {
      throw Error("Unexpected action type");
    }
  }
};

const useSubjects = (
  datasetId: string,
  snapshotTag: string,
): Subject[] | undefined => {
  const [subjects, setSubjects] = useState<Subject[] | undefined>(undefined);
  useEffect(() => {
    let canceled = false;
    const load = async () => {
      setSubjects(undefined);
      const X = await fetchSubjects(datasetId, snapshotTag);
      if (canceled) return;
      setSubjects(X);
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
    case "set": {
      return {
        ...state,
        [action.subjectId]: action.sessions,
      };
    }
    default: {
      throw Error("Unexpected action type");
    }
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
        if (expandedSubjects[subject.subjectId]) {
          if (!sessionsForSubjects[subject.subjectId]) {
            const sessions = await fetchSessions(
              datasetId,
              snapshotTag,
              subject,
            );
            if (canceled) return;
            sessionsForSubjectsDispatch({
              type: "set",
              subjectId: subject.subjectId,
              sessions,
            });
          }
        }
      }
    };
    load();
    return () => {
      canceled = true;
    };
  }, [datasetId, snapshotTag, subjects, expandedSubjects, sessionsForSubjects]);

  return useMemo(() => {
    return (subjects || []).reduce((acc, subject) => {
      if (expandedSubjects[subject.subjectId]) {
        return acc.concat(sessionsForSubjects[subject.subjectId] || []);
      }
      return acc;
    }, [] as Session[]);
  }, [subjects, expandedSubjects, sessionsForSubjects]);
};

const fetchSubjects = async (
  datasetId: string,
  snapshotTag: string,
): Promise<Subject[]> => {
  let query = `query snapshot($datasetId: ID!, $tag: String!) {
  snapshot(datasetId: $datasetId, tag: $tag) {
    id
    ...SnapshotFields
    __typename
  }
}

fragment SnapshotFields on Snapshot {
  id
  tag
  created
  readme
  size
  deprecated {
    id
    user
    reason
    timestamp
    __typename
  }
  description {
    Name
    Authors
    DatasetDOI
    License
    Acknowledgements
    HowToAcknowledge
    Funding
    ReferencesAndLinks
    EthicsApprovals
    __typename
  }
  files {
    id
    key
    filename
    size
    directory
    annexed
    urls
    __typename
  }
  summary {
    modalities
    secondaryModalities
    sessions
    subjects
    subjectMetadata {
      participantId
      age
      sex
      group
      __typename
    }
    tasks
    size
    totalFiles
    dataProcessed
    pet {
      BodyPart
      ScannerManufacturer
      ScannerManufacturersModelName
      TracerName
      TracerRadionuclide
      __typename
    }
    __typename
  }
  analytics {
    downloads
    views
    __typename
  }
  ...SnapshotIssues
  hexsha
  __typename
}

fragment SnapshotIssues on Snapshot {
  id
  issues {
    severity
    code
    reason
    files {
      evidence
      line
      character
      reason
      file {
        name
        path
        relativePath
        __typename
      }
      __typename
    }
    additionalFileCount
    __typename
  }
  __typename
}`;
  query = query.split("\n").join("\\n");
  const body = `{"operationName":"snapshot","variables":{"datasetId":"${datasetId}","tag":"${snapshotTag}"},"query":"${query}"}`;
  const resp = await fetch("https://openneuro.org/crn/graphql", {
    headers: {
      "content-type": "application/json",
    },
    body,
    method: "POST",
  });
  if (!resp.ok) {
    throw new Error("Failed to fetch OpenNeuro datasets");
  }
  const graphQLResponse = await resp.json();
  const dirs = graphQLResponse.data.snapshot.files.filter(
    (a: any) => a.directory,
  );
  return dirs.map((a: any) => ({
    subjectId: a.filename,
    treeId: a.id,
  }));
};

const fetchSessions = async (
  datasetId: string,
  snapshotTag: string,
  subject: Subject,
): Promise<Session[]> => {
  let query = `query snapshot(
  $datasetId: ID!,
  $tag: String!,
  $tree: String!
) {
  snapshot(
    datasetId: $datasetId,
    tag: $tag,
  ) {
    files(tree: $tree) {
      id
      key
      filename
      size
      directory
      annexed
      urls
    }
  }
}`;
  query = query.split("\n").join("\\n");
  const body = `{"operationName":"snapshot","variables":{"datasetId":"${datasetId}","tag":"${snapshotTag}","tree":"${subject.treeId}"},"query":"${query}"}`;
  const resp = await fetch("https://openneuro.org/crn/graphql", {
    headers: {
      "content-type": "application/json",
    },
    body,
    method: "POST",
  });
  if (!resp.ok) {
    throw new Error("Failed to fetch OpenNeuro datasets");
  }
  const graphQLResponse = await resp.json();
  const dirs = graphQLResponse.data.snapshot.files.filter(
    (a: any) => a.directory,
  );
  return dirs.map((a: any) => ({
    subjectId: subject.subjectId,
    sessionId: a.filename,
    treeId: a.id,
  }));
};

export const fetchSnapshotTagForDataset = async (
  datasetId: string,
): Promise<string | undefined> => {
  let query = `query dataset(
  $datasetId: ID!
) {
  dataset(
    id: $datasetId
  ) {
    id
    snapshots {
      id
      created
      tag
    }
  }
}`;
  query = query.split("\n").join("\\n");
  const body = `{"operationName":"dataset","variables":{"datasetId":"${datasetId}"},"query":"${query}"}`;
  const resp = await fetch("https://openneuro.org/crn/graphql", {
    headers: {
      "content-type": "application/json",
    },
    body,
    method: "POST",
  });
  if (!resp.ok) {
    throw new Error("Failed to fetch OpenNeuro dataset");
  }
  const graphQLResponse = await resp.json();
  const snapshots = graphQLResponse.data.dataset.snapshots;
  if (snapshots.length === 0) {
    console.warn("No snapshots found for dataset", datasetId);
    return undefined;
  }
  const snapshot = getMostRecentSnapshot(snapshots);
  return snapshot.tag;
};

const getMostRecentSnapshot = (snapshots: any[]) => {
  return snapshots.reduce((a, b) => {
    const aCreatedStr = a.created;
    const bCreatedStr = b.created;
    const aCreated = new Date(aCreatedStr).getTime();
    const bCreated = new Date(bCreatedStr).getTime();
    return aCreated > bCreated ? a : b;
  });
};

export default SessionsBrowser;
