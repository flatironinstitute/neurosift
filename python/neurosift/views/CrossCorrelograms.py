import numpy as np
from typing import List, Union, Tuple
from ._serialize import _serialize
from .helpers.compute_correlogram_data import compute_correlogram_data


class CrossCorrelogramItem:
    """
    Single cross correlogram
    """
    def __init__(self,
        unit_id1: Union[int, str],
        unit_id2: Union[int, str],
        bin_edges_sec: Union[np.array, List[float]],
        bin_counts: Union[np.array, List[float]]
    ) -> None:
        self.unit_id1 = unit_id1
        self.unit_id2 = unit_id2
        self.bin_edges_sec = bin_edges_sec
        self.bin_counts = bin_counts
    def to_dict(self):
        return {
            'unitId1': self.unit_id1,
            'unitId2': self.unit_id2,
            'binEdgesSec': self.bin_edges_sec,
            'binCounts': self.bin_counts
        }

class CrossCorrelograms:
    """
    Cross correlograms view
    """
    def __init__(self,
        cross_correlograms: List[CrossCorrelogramItem]
    ) -> None:
        self._cross_correlograms = cross_correlograms
    def to_dict(self) -> dict:
        ret = {
            'type': 'CrossCorrelograms',
            'crossCorrelograms': [a.to_dict() for a in self._cross_correlograms]
        }
        return ret
    def save(self, path: str) -> None:
        if not path.endswith('.ns-ccg'):
            raise Exception('File name must end with .ns-ccg')
        import json
        with open(path, 'w') as f:
            json.dump(_serialize(self.to_dict()), f, indent=2)

def create_cross_correlograms(*, sorting, unit_pairs: list[Tuple[int]], output_path: str):
    if not output_path.endswith('.ns-ccg'):
        raise Exception('File name must end with .ns-ccg')
    cross_correlograms: CrossCorrelogramItem = []
    for unit_pair in unit_pairs:
        ac = compute_correlogram_data(sorting=sorting, unit_id1=unit_pair[0], unit_id2=unit_pair[1], window_size_msec=100, bin_size_msec=1)
        item = CrossCorrelogramItem(
            unit_id1=unit_pair[0],
            unit_id2=unit_pair[1],
            bin_edges_sec=ac['bin_edges_sec'],
            bin_counts=ac['bin_counts']
        )
        cross_correlograms.append(item)
    
    X = CrossCorrelograms(cross_correlograms)
    X.save(output_path)