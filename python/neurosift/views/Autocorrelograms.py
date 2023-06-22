import numpy as np
from typing import List, Union
from .helpers.compute_correlogram_data import compute_correlogram_data
from ._serialize import _serialize


class AutocorrelogramItem:
    """
    Single autocorrelogram item (single box)
    """
    def __init__(self,
        unit_id: Union[int, str],
        bin_edges_sec: Union[np.array, List[float]],
        bin_counts: Union[np.array, List[float]]
    ) -> None:
        self.unit_id = unit_id
        self.bin_edges_sec = bin_edges_sec
        self.bin_counts = bin_counts
    def to_dict(self):
        return {
            'unitId': self.unit_id,
            'binEdgesSec': self.bin_edges_sec,
            'binCounts': self.bin_counts
        }

class Autocorrelograms:
    """
    Autocorrelograms view
    """
    def __init__(self,
        autocorrelograms: List[AutocorrelogramItem],
        **kwargs
    ) -> None:
        self._autocorrelograms = autocorrelograms
    def to_dict(self) -> dict:
        ret = {
            'type': 'Autocorrelograms',
            'autocorrelograms': [a.to_dict() for a in self._autocorrelograms]
        }
        return ret
    def save(self, path: str) -> None:
        if not path.endswith('.ns-acg'):
            raise Exception('File name must end with .ns-acg')
        import json
        with open(path, 'w') as f:
            json.dump(_serialize(self.to_dict()), f, indent=2)

def create_autocorrelograms(*, sorting, output_path: str):
    if not output_path.endswith('.ns-acg'):
        raise Exception('File name must end with .ns-acg')
    autocorrelograms: AutocorrelogramItem = []
    unit_ids = sorting.get_unit_ids()
    for unit_id in unit_ids:
        ac = compute_correlogram_data(sorting=sorting, unit_id1=unit_id, window_size_msec=100, bin_size_msec=1)
        item = AutocorrelogramItem(
            unit_id=unit_id,
            bin_edges_sec=ac['bin_edges_sec'],
            bin_counts=ac['bin_counts']
        )
        autocorrelograms.append(item)
    
    X = Autocorrelograms(autocorrelograms)
    X.save(output_path)