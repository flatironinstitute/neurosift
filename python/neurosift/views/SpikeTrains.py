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

class SpikeTrains:
    def __init__(self, *,
        start_time_sec: float,
        end_time_sec: float,
        spike_trains: list[SpikeTrain]
    ) -> None:
        self._start_time_sec = start_time_sec
        self._end_time_sec = end_time_sec
        self._spike_trains = spike_trains
    def to_single_buffer(self) -> bytes:
        ret = {
            'type': 'SpikeTrains',
            'startTimeSec': self._start_time_sec,
            'endTimeSec': self._end_time_sec,
            'units': [{
                'unitId': a.unit_id,
                'spikeTimesSec': a.spike_times_sec
            } for a in self._spike_trains]
        }
        return json.dumps(_serialize(ret)).encode('utf-8')
    def save(self, fname: str, block_size_sec: float=300):
        if not fname.endswith('.ns-spt'):
            raise Exception('File name must end with .ns-spt')
        
        block_starts = np.arange(self._start_time_sec, self._end_time_sec, block_size_sec)
        block_ends = np.concatenate([block_starts[1:], [self._end_time_sec]])
        
        # split into blocks
        json_lines: list[str] = []
        x = {
            'type': 'SpikeTrains',
            'startTimeSec': self._start_time_sec,
            'endTimeSec': self._end_time_sec,
            'blockSizeSec': block_size_sec,
            'numBlocks': len(block_starts),
            'units': [{
                'unitId': a.unit_id,
                'numSpikes': len(a.spike_times_sec)
            } for a in self._spike_trains]
        }
        json_lines.append(json.dumps(_serialize(x)))

        for block_start, block_end in zip(block_starts, block_ends):
            x = {
                'startTimeSec': block_start,
                'endTimeSec': block_end,
                'units': [
                    {
                        'unitId': a.unit_id,
                        'spikeTimesSec': a.spike_times_sec[
                            (a.spike_times_sec >= block_start) & (a.spike_times_sec < block_end)
                        ]
                    }
                    for a in self._spike_trains
                ]
            }
            json_lines.append(json.dumps(_serialize(x)))
        
        json_lines_sizes = [len(a) for a in json_lines]

        with open(fname, 'w') as f:
            f.write(json.dumps(json_lines_sizes) + '\n')
            for a in json_lines:
                f.write(a + '\n')
