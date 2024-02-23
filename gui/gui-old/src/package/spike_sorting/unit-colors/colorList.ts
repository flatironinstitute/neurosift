import chromaJs from 'chroma-js'

// these are used by plotly
const colorList = [
    '#1f77b4',
    '#ff7f0e',
    '#2ca02c',
    '#d62728',
    '#9467bd',
    '#8c564b',
    '#e377c2',
    '#7f7f7f',
    '#bcbd22',
    '#17becf'
  ];

const n = colorList.length
for (let i=0; i<n; i++) {
    colorList.push(chromaJs(colorList[i]).darken(2).hex())
}
for (let i=0; i<n; i++) {
    colorList.push(chromaJs(colorList[i]).brighten(1.5).hex())
}

export default colorList