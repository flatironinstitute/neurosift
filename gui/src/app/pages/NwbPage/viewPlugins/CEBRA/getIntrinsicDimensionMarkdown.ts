const getIntrinsicDimensionMarkdown = (cebraOutputUrl: string) => {
  return `
# Computing intrinsic dimension for this embedding

\`\`\`bash
pip install scikit-dimension lindi
\`\`\`

\`\`\`python
import skdim
import lindi

url = "${cebraOutputUrl}"

f = lindi.LindiH5pyFile.from_lindi_file(url)
embedding = f['embedding'][()]

num_timepoints = embedding.shape[0]
num_dims = embedding.shape[1]

danco = skdim.id.DANCo().fit(embedding)
print("DANCo intrinsic dimension estimate: ", danco.dimension_)
\`\`\`
`;
};

export default getIntrinsicDimensionMarkdown;
