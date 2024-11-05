import {
    FunctionComponent
} from "react";



type EditAdditionalKnowledgeProps = {
    additionalKnowledge: string;
    setAdditionalKnowledge: (additionalKnowledge: string) => void;
  };

  const EditAdditionalKnowledge: FunctionComponent<
    EditAdditionalKnowledgeProps
  > = ({ additionalKnowledge, setAdditionalKnowledge }) => {
    // edit the additional knowledge in a text area of height 400
    return (
      <div style={{ padding: 20 }}>
        <p>
          You can add additional knowledge for the assistant here. This is a
          convenient way to develop the assistant. Reach out to the Neurosift team
          to propose adding this knowledge to the assistant.
        </p>
        <textarea
          style={{ width: "100%", height: 400 }}
          value={additionalKnowledge}
          onChange={(e) => setAdditionalKnowledge(e.target.value)}
        />
      </div>
    );
  };

  export default EditAdditionalKnowledge;