import json
from typing import List

import kachery_cloud as kcl
import numpy as np
import simplejson

from ._serialize import _serialize


class PositionDecodeFieldFrame():
    def __init__(self, *, indices: np.ndarray, values: np.ndarray) -> None:
        if type(indices) == list: indices = np.array(indices, dtype=np.uint16)
        if type(values) == list: values = np.array(values, dtype=np.uint16)

        if indices.ndim != 1: raise Exception('indices must be 1D array')
        if indices.dtype != np.uint16: raise Exception('dtype of indices must be np.uint16')
        if values.ndim != 1: raise Exception('values must be 1D array')
        if values.dtype != np.uint16: raise Exception('dtype of values must be np.uint16')
        self.indices = indices
        self.values = values

class PositionDecodeFieldBin():
    def __init__(self, *, x: float, y: float, w: float, h: float) -> None:
        self.x = x
        self.y = y
        self.w = w
        self.h = h
    def to_dict(self):
        return {'x': self.x, 'y': self.y, 'w': self.w, 'h': self.h}

class PositionDecodeField:
    def __init__(self, *,
        bins: list[PositionDecodeFieldBin],
        frames: list[PositionDecodeFieldFrame],
        width: int,
        height: int,
        max_value: float,
        frames_per_second: float
    ) -> None:
        self.bins = bins
        self.frames = frames
        self.max_value = max_value
        self.width = width
        self.height = height
        self.frames_per_second = frames_per_second
    def save(self, fname: str):
        if not fname.endswith('.ns-pdf'):
            raise Exception('File name must end with .ns-pdf')
        
        # split into blocks
        json_lines: list[str] = []
        x = {
            'type': 'PositionDecodeField',
            'width': self.width,
            'height': self.height,
            'frames_per_second': self.frames_per_second,
            'max_value': self.max_value,
            'bins': [bin.to_dict() for bin in self.bins]
        }
        json_lines.append(json.dumps(_serialize(x)))

        for frame in self.frames:
            x = {
                'indices': frame.indices,
                'values': frame.values
            }
            json_lines.append(json.dumps(_serialize(x)))
        
        json_lines_sizes = [len(a) for a in json_lines]

        with open(fname, 'w') as f:
            f.write(json.dumps(json_lines_sizes) + '\n')
            for a in json_lines:
                f.write(a + '\n')