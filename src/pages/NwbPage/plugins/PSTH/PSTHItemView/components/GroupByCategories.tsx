import { FunctionComponent } from "react";

type Props = {
  groupByVariableCategories: string[] | undefined;
  setGroupByVariableCategories: (x: string[] | undefined) => void;
  options: string[];
};

const GroupByCategoriesComponent: FunctionComponent<Props> = ({
  groupByVariableCategories,
  setGroupByVariableCategories,
  options,
}) => {
  const allSelected = !groupByVariableCategories || groupByVariableCategories.length === options.length;

  return (
    <table className="nwb-table" style={{ tableLayout: "fixed" }}>
      <colgroup>
        <col style={{ width: 20 }} />
      </colgroup>
      <tbody>
        <tr>
          <td style={{ padding: "4px 2px" }}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => {}}
              onClick={() => {
                if (allSelected) {
                  setGroupByVariableCategories([]);
                } else {
                  setGroupByVariableCategories(undefined);
                }
              }}
            />
          </td>
          <td style={{ fontStyle: "italic" }}>All</td>
        </tr>
        {options.map((option) => (
          <tr key={option}>
            <td style={{ padding: "4px 2px" }}>
              <input
                type="checkbox"
                checked={
                  groupByVariableCategories?.includes(option) ||
                  !groupByVariableCategories
                }
                onChange={() => {}}
                onClick={() => {
                  if (groupByVariableCategories) {
                    if (groupByVariableCategories.includes(option)) {
                      setGroupByVariableCategories(
                        groupByVariableCategories.filter((x) => x !== option),
                      );
                    } else {
                      setGroupByVariableCategories([
                        ...groupByVariableCategories,
                        option,
                      ]);
                    }
                  } else {
                    setGroupByVariableCategories(
                      options.filter((x) => x !== option),
                    );
                  }
                }}
              />
            </td>
            <td>{option}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default GroupByCategoriesComponent;
