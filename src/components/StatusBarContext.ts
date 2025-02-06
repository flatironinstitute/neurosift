export type StatusBarItem =
  | {
      type: "progress";
      label: string;
      progress: number; // out of 100
    }
  | {
      type: "text";
      text: string;
    };

type StatusItems = { [key: string]: StatusBarItem };
type Callback = (items: StatusItems) => void;

// Global state
let items: StatusItems = {};
const callbacks = new Set<Callback>();

export const setStatusItem = (name: string, item: StatusBarItem) => {
  items = { ...items, [name]: item };
  notifyCallbacks();
};

export const removeStatusItem = (name: string) => {
  const newItems = { ...items };
  delete newItems[name];
  items = newItems;
  notifyCallbacks();
};

export const getStatusItems = () => {
  return items;
};

export const registerStatusCallback = (callback: Callback) => {
  callbacks.add(callback);
  // Initial callback with current items
  callback(items);
  return () => {
    callbacks.delete(callback);
  };
};

const notifyCallbacks = () => {
  callbacks.forEach((cb) => cb(items));
};
