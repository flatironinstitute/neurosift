import { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react';
import useNeurosiftAnnotations from '../../../NeurosiftAnnotations/useNeurosiftAnnotations';
import useContextAnnotations from '../NeurosiftAnnotations/useContextAnnotations';
import { SmallIconButton } from '@fi-sci/misc';
import { Add, Edit } from '@mui/icons-material';
import { NeurosiftAnnotation } from '../NeurosiftAnnotations/types';
import UserIdComponent from './UserIdComponent';

type ObjectNotesViewProps = {
  objectPath?: string;
  onClose: () => void;
};

const ObjectNotesView: FunctionComponent<ObjectNotesViewProps> = ({ objectPath }) => {
  const { neurosiftAnnotationsUserId } = useNeurosiftAnnotations();
  const { contextAnnotations, addContextAnnotation, removeContextAnnotation } =
    useContextAnnotations();
  const [operating, setOperating] = useState(false);
  const notesForThisObject = useMemo(() => {
    if (!contextAnnotations) return undefined;
    const notes = contextAnnotations.filter((a) => a.annotationType === 'note' && (!objectPath || a.annotation.objectPath === objectPath));
    return notes;
  }, [contextAnnotations, objectPath]);

  const [addingNote, setAddingNote] = useState(false)

  const notesForThisObjectForCurrentUser = useMemo(() => {
    if (!notesForThisObject) return undefined;
    const ret: (NeurosiftAnnotation | undefined)[] = notesForThisObject.filter((n) => n.userId === neurosiftAnnotationsUserId);
    if (addingNote) {
      ret.push(undefined) // placeholder for new note that can be added
    }
    return ret;
  }, [notesForThisObject, neurosiftAnnotationsUserId, addingNote]);

  if (!contextAnnotations) return <span />;
  return (
    <div>
      {neurosiftAnnotationsUserId ? (
        <>
          <h3>WARNING: This is an experimental feature.</h3>
          <h3>WARNING: All annotations are public.</h3>
          <h3>
            {!objectPath ? <span>Notes for <UserIdComponent userId={neurosiftAnnotationsUserId} /></span> : objectPath !== '/' ? <span>Notes for {objectPath} for <UserIdComponent userId={neurosiftAnnotationsUserId} /></span> : <span>Top-level notes for <UserIdComponent userId={neurosiftAnnotationsUserId} /></span>}
          </h3>
          <div>
            {(notesForThisObjectForCurrentUser || [])
              .map((note) => (
                <div key={note?.annotationId || 'undefined'}>
                  <UserHeading userId={neurosiftAnnotationsUserId} />
                  <EditNoteText
                    value={note?.annotation.text || ''}
                    disabled={operating}
                    initialEditing={!note}
                    onChange={async (text) => {
                      setOperating(true);
                      try {
                        if (text) {

                          const aa = {
                            objectPath,
                            text,
                          }
                          const annotationType = 'note';
                          await addContextAnnotation(annotationType, aa)
                          if (note?.annotationId) {
                            await removeContextAnnotation(note.annotationId)
                          }
                        } else {
                          if (note) {
                            await removeContextAnnotation(note.annotationId)
                          }
                        }
                      }
                      finally {
                        setOperating(false);
                        if (!note) {
                          setAddingNote(false)
                        }
                      }
                    }}
                  />
                </div>
              ))}
          </div>
          {!addingNote && (
            <div>
              <div>&nbsp;</div>
              <SmallIconButton
                icon={<Add />}
                title="Add note"
                onClick={() => setAddingNote(true)}
                label="Add note"
              />
            </div>
          )}
        </>
      ) : (
        <div>
          <p>To add a note, sign in using the ANNOTATIONS tab of an NWB view.</p>
        </div>
      )}
      <hr />
      <h3>{!objectPath ? <span>Notes {!neurosiftAnnotationsUserId ? "from other users" : ""}</span> : objectPath !== '/' ? <span>Notes for {objectPath} {neurosiftAnnotationsUserId ? "from other users" : ""}</span> : <span>Top-level notes {neurosiftAnnotationsUserId ? "from other users" : ""}</span>}</h3>
      {(notesForThisObject || [])
        .filter((n) => n.userId !== neurosiftAnnotationsUserId)
        .map((note) => (
          <div key={note.annotationId}>
            <UserHeading userId={note.userId} />
            <div>{note.annotation.text}</div>
            <div>&nbsp;</div>
          </div>
        ))}
    </div>
  );
};

type UserHeadingProps = {
  userId: string;
};

const UserHeading: FunctionComponent<UserHeadingProps> = ({ userId }) => {
  return (
    <span style={{fontWeight: 'bold'}}>
      <UserIdComponent userId={userId} />
    </span>
  )
};

type EditNoteTextProps = {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  initialEditing: boolean;
};

const EditNoteText: FunctionComponent<EditNoteTextProps> = ({ value, onChange, disabled, initialEditing }) => {
  const [editing, setEditing] = useState(initialEditing);
  const [internalValue, setInternalValue] = useState(value);
  useEffect(() => {
    setInternalValue(value);
  }, [value]);
  const handleSave = useCallback(() => {
    onChange(internalValue);
  }, [internalValue, onChange]);
  const modified = internalValue !== value;
  if (!editing) {
    return (
      <div>
        <div>{value}</div>
        <SmallIconButton
          icon={<Edit />}
          title="Edit note"
          onClick={() => setEditing(true)}
        />
        <div>&nbsp;</div>
      </div>
    );
  }
  else {
    return (
      <div>
        <textarea
          value={internalValue}
          disabled={disabled}
          onChange={(e) => setInternalValue(e.target.value)}
          style={{ width: '100%', height: 100 }}
        />
        <div>
          <button disabled={disabled || !modified} onClick={handleSave}>
            Save
          </button>
          &nbsp;
          <button disabled={disabled} onClick={() => {
            setEditing(false);
          }}>
            Cancel
          </button>
          <button disabled={disabled} onClick={() => {
            const ok = window.confirm('Are you sure you want to delete this note?');
            if (!ok) return;
            onChange('');
          }}>
            Delete
          </button>
        </div>
        <div>&nbsp;</div>
      </div>
    );
  }
};

export default ObjectNotesView;
