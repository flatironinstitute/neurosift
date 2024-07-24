import { FunctionComponent } from "react";

type DynamicTableColumnInfoViewProps = {
  columnNames: string[];
  columnDescriptions: { [key: string]: string };
};

const DynamicTableColumnInfoView: FunctionComponent<
  DynamicTableColumnInfoViewProps
> = ({ columnNames, columnDescriptions }) => {
  return (
    <table className="nwb-table">
      <thead>
        <tr>
          <td>Column</td>
          <td>Description</td>
        </tr>
      </thead>
      <tbody>
        {columnNames.map((name) => (
          <tr key={name}>
            <td>{name}</td>
            <td>{columnDescriptions[name] || ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default DynamicTableColumnInfoView;
