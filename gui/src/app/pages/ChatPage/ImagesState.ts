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
