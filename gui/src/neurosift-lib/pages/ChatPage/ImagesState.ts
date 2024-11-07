export type ImagesState = {
  name: string;
  dataUrl: string;
}[];

export type ImagesAction = {
  type: "add";
  name: string;
  dataUrl: string;
};

export const imagesReducer = (
  state: ImagesState,
  action: ImagesAction,
): ImagesState => {
  if (action.type === "add") {
    return [...state, { name: action.name, dataUrl: action.dataUrl }];
  } else {
    return state;
  }
};

export type FigureDataFilesState = {
  name: string;
  content: string;
}[];

export type FigureDataFilesAction = {
  type: "add";
  name: string;
  content: string;
};

export const figureDataFilesReducer = (
  state: FigureDataFilesState,
  action: FigureDataFilesAction,
): FigureDataFilesState => {
  if (action.type === "add") {
    return [...state, { name: action.name, content: action.content }];
  } else {
    return state;
  }
};
