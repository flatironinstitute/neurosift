import { RemoteH5Group } from "../remote-h5-file/index";

export const getCustomPythonCodeForTimeSeries = (group: RemoteH5Group) => {
  let customCode = "";
  if (group.datasets.find((ds) => ds.name === "starting_time")) {
    customCode = `
starting_time = X['starting_time'][()]
rate = X['starting_time'].attrs['rate']
data = X['data']

print(f'starting_time: {starting_time}')
print(f'rate: {rate}')
print(f'data shape: {data.shape}')
`;
  } else if (group.datasets.find((ds) => ds.name === "timestamps")) {
    customCode = `
timestamps = X['timestamps']
data = X['data']

print(f'timestamps shape: {timestamps.shape}')
print(f'data shape: {data.shape}')
`;
  }
  return customCode;
};

export const getCustomPythonCodeForTimeIntervals = (group: RemoteH5Group) => {
  let customCode = "\n";
  group.datasets.forEach((ds) => {
    customCode += `${ds.name} = X['${ds.name}']\n`;
  });
  customCode += "\n";
  if (group.datasets.find((ds) => ds.name === "id")) {
    customCode += `print(f'Shape of id: {id.shape}')\n`;
  }
  if (group.datasets.find((ds) => ds.name === "start_time")) {
    customCode += `print(f'Shape of start_time: {start_time.shape}')\n`;
  }
  if (group.datasets.find((ds) => ds.name === "stop_time")) {
    customCode += `print(f'Shape of stop_time: {stop_time.shape}')\n`;
  }
  return customCode;
};

export const getCustomPythonCodeForUnits = (group: RemoteH5Group) => {
  let customCode = "\n";
  group.datasets.forEach((ds) => {
    customCode += `${ds.name} = X['${ds.name}']\n`;
  });
  customCode += "\n";
  if (group.datasets.find((ds) => ds.name === "id")) {
    customCode += `print(f'Shape of id: {id.shape}')\n`;
  }
  if (group.datasets.find((ds) => ds.name === "spike_times")) {
    customCode += `print(f'Shape of spike_times: {spike_times.shape}')\n`;
  }
  if (group.datasets.find((ds) => ds.name === "spike_times_index")) {
    customCode += `print(f'Shape of spike_times_index: {spike_times_index.shape}')\n`;
  }
  return customCode;
};
