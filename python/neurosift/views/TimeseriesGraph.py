import json
import numpy as np
from typing import List, Union
from ._serialize import _serialize


class TGDataset:
    def __init__(self, *, name: str, data: dict) -> None:
        self._name = name
        self._data = data
    def to_dict(self, *, start_time_sec: float, end_time_sec: float):
        inds = np.where((self._data['t'] >= start_time_sec) & (self._data['t'] <= end_time_sec))[0]
        return {
            'name': self._name,
            'data': {
                't': self._data['t'][inds],
                'y': self._data['y'][inds]
            }
        }

class TGSeries:
    def __init__(self, *, type: str, dataset: str, encoding: dict, attributes: dict, title: str='') -> None:
        self._type = type
        self._dataset = dataset
        self._encoding = encoding
        self._attributes = attributes
        self._title = title
    def to_dict(self):
        return {
            'type': self._type,
            'dataset': self._dataset,
            'encoding': self._encoding,
            'attributes': self._attributes,
            'title': self._title
        }

class TimeseriesGraph:
    def __init__(self, *,
        legend_opts: Union[None, dict]=None,
        y_range: Union[List[float], None]=None,
        hide_x_gridlines: Union[bool, None]=None,
        hide_y_gridlines: Union[bool, None]=None,
        hide_toolbar: bool=False
    ) -> None:
        self.type = 'TimeseriesGraph'
        self._datasets = []
        self._series = []
        self._legend_opts = legend_opts
        self._y_range = y_range
        # time_offset is used to allow float64 type in the time arrays
        self._time_offset = None
        self._hide_x_gridlines = hide_x_gridlines
        self._hide_y_gridlines = hide_y_gridlines
        self._hide_toolbar = hide_toolbar
    def add_line_series(self, *,
            name: str,
            t: np.array,
            y: np.array,
            color: str,
            width: Union[None, int]=None,
            dash: Union[None, List[int]]=None
        ):
        # allow float64 for time array
        t = self._handle_time_offset_t(t)

        if t.dtype == np.float64:
            raise Exception('Cannot handle float64 datatype for t parameter in add_line_series')
        if y.dtype == np.float64:
            raise Exception('Cannot handle float64 datatype for y parameter in add_line_series')

        attributes = {'color': color}
        if width is not None:
            attributes['width'] = width
        if dash is not None:
            attributes['dash'] = dash
        self._add_series(type='line', name=name, t=t, y=y, attributes=attributes)
        return self
    def add_marker_series(self, *,
            name: str,
            t: np.array,
            y: np.array,
            color: str,
            radius: Union[None, int]=None,
            shape: Union[None, str]=None
        ):
        # allow float64 for time array
        t = self._handle_time_offset_t(t)
        
        if t.dtype == np.float64:
            raise Exception('Cannot handle float64 datatype for t parameter in add_marker_series')
        if y.dtype == np.float64:
            raise Exception('Cannot handle float64 datatype for y parameter in add_marker_series')
        attributes = {'color': color}
        if radius is not None:
            attributes['radius'] = radius
        if shape is not None:
            attributes['shape'] = shape
        self._add_series(type='marker', name=name, t=t, y=y, attributes=attributes)
        return self
    def add_dataset(self, ds: TGDataset):
        self._datasets.append(ds)
        return self
    def add_series(self, s: TGSeries):
        self._series.append(s)
        return self
    def save(self, fname: str, block_size_sec: float=300):
        if not fname.endswith('.ns-tgr'):
            raise Exception('TimeseriesGraph::save fname argument must end with .ns-tgr')
        
        start_time_sec = float(np.min([ds._data['t'][0] for ds in self._datasets]))
        end_time_sec = float(np.max([ds._data['t'][-1] for ds in self._datasets]))
        
        block_starts = np.arange(start_time_sec, end_time_sec, block_size_sec)
        block_ends = np.concatenate([block_starts[1:], [end_time_sec]])

        # split into blocks
        json_lines: list[str] = []
        header = {
            'type': 'TimeseriesGraph',
            'startTimeSec': start_time_sec,
            'endTimeSec': end_time_sec,
            'blockSizeSec': block_size_sec,
            'numBlocks': len(block_starts),
            'series': [s.to_dict() for s in self._series]
        }
        if self._time_offset is not None:
            header['timeOffset'] = self._time_offset
        if self._legend_opts is not None:
            header['legendOpts'] = self._legend_opts
        if self._y_range is not None:
            assert len(self._y_range) == 2
            header['yRange'] = self._y_range
        if (self._hide_x_gridlines is not None) or (self._hide_y_gridlines is not None):
            header['gridlineOpts'] = {
                'hideX': True if self._hide_x_gridlines is True else False,
                'hideY': True if self._hide_y_gridlines is True else False
            }
        if self._hide_toolbar:
            header['hideToolbar'] = self._hide_toolbar
        json_lines.append(json.dumps(_serialize(header)))

        for block_start, block_end in zip(block_starts, block_ends):
            x = {
                'startTimeSec': block_start,
                'endTimeSec': block_end,
                'datasets': [
                    ds.to_dict(start_time_sec=block_start, end_time_sec=block_end)
                    for ds in self._datasets
                ]
            }
            json_lines.append(json.dumps(_serialize(x)))
        
        json_line_sizes = [len(line) for line in json_lines]

        with open(fname, 'w') as f:
            f.write(json.dumps(json_line_sizes) + '\n')
            for line in json_lines:
                f.write(line + '\n')

    def _add_series(self, *, type: str, name: str, t: np.ndarray, y: np.ndarray, attributes: dict):
        if t.ndim != 1:
            print('WARNING: TimeseriesGraph::_add_series t argument is not 1D array. Using squeeze.')
            t = np.squeeze(t)
        if y.ndim != 1:
            print('WARNING: TimeseriesGraph::_add_series y argument is not 1D array. Using squeeze.')
            y = np.squeeze(y)
        ds = TGDataset(
            name=name,
            data={
                't': t,
                'y': y
            }
        )
        s = TGSeries(
            type=type,
            encoding={'t': 't', 'y': 'y'},
            dataset=name,
            attributes=attributes,
            title=name
        )
        self.add_dataset(ds)
        self.add_series(s)
    def _handle_time_offset_t(self, t: np.array):
        if t.dtype == np.float64:
            # We have a float64, let's see if we have a time offset
            if self._time_offset is None:
                # we don't, let's make one
                self._time_offset = t[0]
        if self._time_offset is not None:
            # if we have a time offset, let's subtract it
            t = (t - self._time_offset)
            if t.dtype == np.float64:
                # if we have a float64, now that we've subtracted the time offset, it's safe to use float32
                t = t.astype(np.float32)
        return t
