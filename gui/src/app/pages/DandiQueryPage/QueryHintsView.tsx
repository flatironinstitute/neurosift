import { FunctionComponent } from "react"
import Markdown from "../../Markdown/Markdown"

type QueryHintsViewProps = {
    //
}

const QueryHintsView: FunctionComponent<QueryHintsViewProps> = () => {
    return (
        <div>
            <Markdown source={md} />
        </div>
    )
}

const md = `
# Query hints

Queries use either [jsonpath](https://goessner.net/articles/JsonPath/) syntax or JavaScript.
JSONPath is simpler, but slower and less flexible. JavaScript is more powerful, but can be more
complex.

## JSONPath Examples

\`\`\`
// All neurodata types
$..attrs.neurodata_type
\`\`\`

\`\`\`
// All neurodata types within acquisition
$.acquisition..attrs.neurodata_type
\`\`\`

\`\`\`
// All compressors
$.._zarray.compressor
\`\`\`

\`\`\`
// All descriptions
$..attrs.description
\`\`\`

## JavaScript Examples

\`\`\`
// The shapes of all ElectricalSeries with more than 1000 samples
return groups
  .filter(([k, g]) => (
      k.startsWith('acquisition/') &&
      g.attrs.neurodata_type === 'ElectricalSeries' &&
      g.data._zarray.shape[0] > 1000
  ))
  .map(([k, g]) => (
    \`\${k}: [\${g.data._zarray.shape. join(', ')}]\`
  ))
\`\`\`
`

export default QueryHintsView
