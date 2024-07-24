import { FunctionComponent } from "react";
import { getViewPlugins } from "../NwbPage/viewPlugins/viewPlugins";

type TestsPageProps = {
  width: number;
  height: number;
};

const viewPlugins = getViewPlugins({ nwbUrl: "" });
const sortedViewPlugins = [...viewPlugins].sort((p1, p2) => {
  if (p1.name < p2.name) return -1;
  if (p1.name > p2.name) return 1;
  return 0;
});

const TestsPage: FunctionComponent<TestsPageProps> = () => {
  return (
    <table className="nwb-table" style={{ maxWidth: 400 }}>
      <thead>
        <tr>
          <th>View plugin</th>
          <th>Test links</th>
        </tr>
      </thead>
      <tbody>
        {sortedViewPlugins.map((p) => (
          <tr key={p.name}>
            <td>{p.name}</td>
            <td>
              {p.testLinks &&
                p.testLinks.map((url) => <a href={filterUrl(url)}>test</a>)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const filterUrl = (url: string) => {
  if (url.startsWith("https://neurosift.app")) {
    return `${window.location.protocol}//${window.location.host}${url.slice("https://neurosift.app".length)}`;
  } else return url;
};

export default TestsPage;
