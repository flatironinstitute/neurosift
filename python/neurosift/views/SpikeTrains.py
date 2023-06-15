import json
import numpy as np
from typing import Union
from ._serialize import _serialize


class SpikeTrain:
    """
    Spike train for a single unit
    """
    def __init__(self,
        unit_id: Union[int, str],
        spike_times_sec: np.array
    ) -> None:
        if spike_times_sec.dtype not in [np.float32, np.int32]:
            raise Exception('spike_times_sec must be float32 or int32')
        self.unit_id = unit_id
        self.spike_times_sec = spike_times_sec
    def to_dict(self):
        ret = {
            'unitId': self.unit_id,
            'spikeTimesSec': self.spike_times_sec
        }
        return ret

class SpikeTrains:
    def __init__(self, *,
        start_time_sec: float,
        end_time_sec: float,
        spike_trains: list[SpikeTrain]
    ) -> None:
        self._start_time_sec = start_time_sec
        self._end_time_sec = end_time_sec
        self._spike_trains = spike_trains
    def to_dict(self) -> dict:
        ret = {
            'type': 'SpikeTrains',
            'startTimeSec': self._start_time_sec,
            'endTimeSec': self._end_time_sec,
            'spikeTrains': [a.to_dict() for a in self._spike_trains]
        }
        return ret
    def save(self, fname: str):
        if not fname.endswith('ns-spt'):
            raise Exception('File name must end with .ns-spt')
        with open(fname, 'w') as f:
            json.dump(_serialize(self.to_dict()), f, indent=2)
