from typing import Tuple, Union
import numpy as np
import neurosift.views as nv
import json
from .views._serialize import _serialize
import os


class RtcsharePlugin:
    def initialize(context):
        context.register_service('pynapple', PynappleService)

class PynappleService:
    def handle_query(query: dict, *, dir: str, user_id: Union[str, None]=None) -> Tuple[dict, bytes]:
        import pynapple as nap
        from pynapple import TsGroup, TsdFrame
        # todo: authenticate user
        type0 = query['type']
        if type0 == 'session_summary':
            session_uri: str = query['session_uri']
            if session_uri.startswith('$dir'):
                session_uri = f'{dir}/{session_uri[len("$dir"):]}'
            if not session_uri.startswith('rtcshare://'):
                raise Exception(f'Invalid session uri: {session_uri}')
            session_relpath = session_uri[len('rtcshare://'):]
            session_fullpath = os.path.join(os.environ['RTCSHARE_DIR'], session_relpath)
            session = nap.load_session(session_fullpath, 'neurosuite')
            objects = []
            for x in __builtins__['dir'](session):
                v = getattr(session, x)
                if x.startswith('_'):
                    continue
                if isinstance(v, TsGroup):
                    objects.append({
                        'name': x,
                        'type': 'TsGroup'
                    })
                elif isinstance(v, TsdFrame):
                    objects.append({
                        'name': x,
                        'type': 'TsdFrame'
                    })
                elif isinstance(v, dict):
                    objects.append({
                        'name': x,
                        'type': 'dict'
                    })
            return {
                'objects': objects,
                'success': True
            }, b''
        elif type0 == 'get_tsgroup':
            object_name: str = query['object_name']
            session_uri: str = query['session_uri']
            if session_uri.startswith('$dir'):
                session_uri = f'{dir}/{session_uri[len("$dir"):]}'
            if not session_uri.startswith('rtcshare://'):
                raise Exception(f'Invalid session uri: {session_uri}')
            session_relpath = session_uri[len('rtcshare://'):]
            session_fullpath = os.path.join(os.environ['RTCSHARE_DIR'], session_relpath)
            session = nap.load_session(session_fullpath, 'neurosuite')

            obj = getattr(session, object_name)
            spike_trains: list[nv.SpikeTrain] = []
            start_time_sec = None
            end_time_sec = None
            for k in obj.keys():
                spike_times_sec = obj[k].times().astype(np.float32)
                spike_trains.append(nv.SpikeTrain(
                    unit_id=k,
                    spike_times_sec=spike_times_sec
                ))
                if len(spike_times_sec) == 0:
                    continue
                if start_time_sec is None:
                    start_time_sec = spike_times_sec[0]
                else:
                    start_time_sec = min(start_time_sec, spike_times_sec[0])
                if end_time_sec is None:
                    end_time_sec = spike_times_sec[-1]
                else:
                    end_time_sec = max(end_time_sec, spike_times_sec[-1])
            X = nv.SpikeTrains(
                start_time_sec=start_time_sec,
                end_time_sec=end_time_sec,
                spike_trains=spike_trains,
            )
            return {
                'success': True
            }, X.to_single_buffer()
        elif type0 == 'get_tsdframe':
            object_name: str = query['object_name']
            session_uri: str = query['session_uri']
            if session_uri.startswith('$dir'):
                session_uri = f'{dir}/{session_uri[len("$dir"):]}'
            if not session_uri.startswith('rtcshare://'):
                raise Exception(f'Invalid session uri: {session_uri}')
            session_relpath = session_uri[len('rtcshare://'):]
            session_fullpath = os.path.join(os.environ['RTCSHARE_DIR'], session_relpath)
            session = nap.load_session(session_fullpath, 'neurosuite')

            obj: TsdFrame = getattr(session, object_name)
            ret = {
                'type': 'TsdFrame',
                'times': obj.times().astype(np.float32),
                'columns': []
            }
            for k in obj.keys():
                ret['columns'].append({
                    'name': k,
                    'values': obj[k].values.astype(np.float32)
                })
            return {
                'success': True
            }, json.dumps(_serialize(ret)).encode('utf-8')
        else:
            raise Exception(f'Unexpected query type: {type0}')
