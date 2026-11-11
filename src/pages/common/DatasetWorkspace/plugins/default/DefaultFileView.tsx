import { formatBytes } from "@shared/util/formatBytes";
import { Button, DescriptionList } from "@ui";
import { FunctionComponent, useId } from "react";
import { DatasetPluginProps } from "../pluginInterface";
import useCopyText from "../useCopyText";
import useResolvedDatasetFileUrl from "../useResolvedDatasetFileUrl";
import "./DefaultFileView.css";

const mirror = (index: number) => (index > 0 ? ` (mirror ${index + 1})` : "");

/** A file's path, size, ID and URLs, with Download; it shows under every viewer. */
const DefaultFileView: FunctionComponent<DatasetPluginProps> = ({ file }) => {
  const headingId = useId();
  const copy = useCopyText();
  const isImage = !!file.filename.match(/\.(jpg|jpeg|png|gif)$/i);
  const imageUrl = useResolvedDatasetFileUrl(
    isImage ? file.urls[0] : undefined,
  );
  return (
    <section className="file-info" aria-labelledby={headingId}>
      <h2 id={headingId} className="file-info-heading">
        File information
      </h2>
      <DescriptionList
        label="File information"
        items={[
          { term: "Path", value: file.filename },
          { term: "Size", value: formatBytes(file.size) },
          { term: "ID", value: file.id, code: true },
          {
            term: file.urls.length > 1 ? "URLs" : "URL",
            code: true,
            value: (
              <ul className="file-info-urls">
                {file.urls.map((url, index) => (
                  <li key={url} className="file-info-url">
                    <span className="file-info-url-text">{url}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="copy"
                      aria-label={`Copy the link${mirror(index)}`}
                      onClick={() => copy(url, "Link copied")}
                    >
                      Copy
                    </Button>
                  </li>
                ))}
              </ul>
            ),
          },
        ]}
      />
      <div className="file-info-actions">
        {file.urls.map((url, index) => (
          <Button
            key={url}
            variant="secondary"
            icon="download"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {`Download${mirror(index)}`}
          </Button>
        ))}
      </div>
      {isImage && imageUrl && (
        <figure className="file-info-preview">
          <figcaption className="file-info-heading">Preview</figcaption>
          <img className="file-info-image" src={imageUrl} alt={file.filename} />
        </figure>
      )}
    </section>
  );
};

export default DefaultFileView;
