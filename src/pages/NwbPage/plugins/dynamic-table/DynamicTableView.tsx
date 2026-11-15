import DynamicTable from "./DynamicTable/DynamicTable";

const DynamicTableView: React.FC<{ nwbUrl: string; path: string }> = ({
  nwbUrl,
  path,
}) => <DynamicTable nwbUrl={nwbUrl} path={path} />;

export default DynamicTableView;
