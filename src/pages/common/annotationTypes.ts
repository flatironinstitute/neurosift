// An annotation record as returned by the annotation manager API and passed
// to the onAnnotationsUpdate callbacks of the annotation components.
export type ResourceAnnotation = {
  id?: string;
  tags?: string[];
  data: { content: string };
};
