/** The datasets an Images group can draw (2D grayscale, 3D colour) and the largest height and width among them. */
export function galleryImages<T extends { shape: number[] }>(datasets: T[]) {
  const images = datasets.filter(
    (d) => d.shape.length === 2 || d.shape.length === 3,
  );
  return {
    images,
    height: Math.max(0, ...images.map((d) => d.shape[0])),
    width: Math.max(0, ...images.map((d) => d.shape[1])),
  };
}
