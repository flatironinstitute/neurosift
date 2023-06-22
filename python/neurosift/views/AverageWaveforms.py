import numpy as np
from typing import Any, Dict, List, Union
import kachery_cloud as kcl
from ._serialize import _serialize


class AverageWaveformItem:
    """
    Single average waveform item (single box)
    """
    def __init__(self,
        unit_id: Union[int, str],
        channel_ids: List[Union[int, str]],
        waveform: np.array,
        waveform_std_dev: Union[None, np.array]=None
    ) -> None:
        self.unit_id = unit_id
        self.channel_ids = channel_ids
        self.waveform = waveform
        self.waveform_std_dev = waveform_std_dev
    def to_dict(self):
        ret = {
            'unitId': self.unit_id,
            'channelIds': self.channel_ids,
            'waveform': self.waveform
        }
        if self.waveform_std_dev is not None:
            ret['waveformStdDev'] = self.waveform_std_dev
        return ret
class AverageWaveforms:
    """
    Average waveforms view
    """
    def __init__(self,
        average_waveforms: List[AverageWaveformItem], *,
        channel_locations: Union[None, Dict[str, Any]] = None
    ) -> None:
        self._average_waveforms = average_waveforms
        self._channel_locations = channel_locations
    def to_dict(self) -> dict:
        ret = {
            'type': 'AverageWaveforms',
            'averageWaveforms': [a.to_dict() for a in self._average_waveforms]
        }
        if self._channel_locations is not None:
            ret['channelLocations'] = self._channel_locations
        return ret
    def save(self, path: str) -> None:
        if not path.endswith('.ns-awf'):
            raise Exception('File name must end with .ns-awf')
        import json
        with open(path, 'w') as f:
            json.dump(_serialize(self.to_dict()), f, indent=2)
