from typing import Tuple, Union
import numpy as np
import neurosift.views as nv
import json
from .views._serialize import _serialize
import os
import json


class RtcsharePlugin:
    def initialize(context):
        context.register_service('pynapple', PynappleService)
        context.register_service('neurosift.sleap', SleapService)
        context.register_service('sleap', SleapService) # temporary alias
        context.register_service('neurosift-nwb-request', NeurosiftNwbRequestService)

class NeurosiftNwbRequestService:
    def handle_query(query: dict, *, dir: str, user_id: Union[str, None]=None) -> Tuple[dict, bytes]:
        from filelock import FileLock
        neurosift_nwb_dir = os.environ['RTCSHARE_DIR'] + '/.neurosift-nwb'
        os.makedirs(neurosift_nwb_dir, exist_ok=True)
        req_fname = f'{neurosift_nwb_dir}/pending-requests.jsonl'
        lock_fname = f'{req_fname}.lock'
        lock = FileLock(lock_fname)
        with lock:
            type0 = query['type']
            if type0 == 'request-meta-nwb':
                nwb_url = query['nwbUrl']
                if not _is_valid_nwb_url(nwb_url):
                    raise Exception(f'Invalid nwbUrl: {nwb_url}')
                with open(req_fname, 'a') as f:
                    f.write(json.dumps({
                        'type': type0,
                        'nwbUrl': nwb_url
                    }) + '\n')
                return {
                    'success': True
                }, b''
            elif type0 == 'request-raster-plot':
                nwb_url = query['nwbUrl']
                path = query['path']
                if not _is_valid_nwb_url(nwb_url):
                    raise Exception(f'Invalid nwbUrl: {nwb_url}')
                if not _is_valid_path(path):
                    raise Exception(f'Invalid path: {path}')
                with open(req_fname, 'a') as f:
                    f.write(json.dumps({
                        'type': type0,
                        'nwbUrl': nwb_url,
                        'path': path
                    }) + '\n')
                return {
                    'success': True
                }, b''
            elif type0 == 'request-autocorrelograms':
                nwb_url = query['nwbUrl']
                path = query['path']
                if not _is_valid_nwb_url(nwb_url):
                    raise Exception(f'Invalid nwbUrl: {nwb_url}')
                if not _is_valid_path(path):
                    raise Exception(f'Invalid path: {path}')
                with open(req_fname, 'a') as f:
                    f.write(json.dumps({
                        'type': type0,
                        'nwbUrl': nwb_url,
                        'path': path
                    }) + '\n')
                return {
                    'success': True
                }, b''
            else:
                raise Exception(f'Unexpected type: {type0}')

def _is_valid_nwb_url(nwb_url: str) -> bool:
    if not nwb_url.startswith('https://') and not nwb_url.startswith('http://'):
        return False
    if len(nwb_url) > 10000:
        return False
    return True


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

            session_fullpath = _full_path_from_uri(session_uri, dir=dir)
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
            session_fullpath = _full_path_from_uri(session_uri, dir=dir)
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

class SleapService:
    def handle_query(query: dict, *, dir: str, user_id: Union[str, None]=None) -> Tuple[dict, bytes]:
        import sleap_io.io.slp as slp
        from sleap_io.model.skeleton import Symmetry
        type0 = query['type']
        if type0 == 'get_skeletons':
            slp_file_uri: str = query['slp_file_uri']
            slp_file_fullpath = _full_path_from_uri(slp_file_uri, dir=dir)
            xx = slp.read_labels(slp_file_fullpath)
            def _skeleton_to_dict(skeleton: slp.Skeleton):
                return {
                    'name': skeleton.name,
                    'node_names': skeleton.node_names,
                    'edge_inds': skeleton.edge_inds,
                    'symmetries': [
                        [
                            node.name
                            for node in sym.nodes 
                        ]
                        for sym in skeleton.symmetries
                    ]
                }
                
            skeletons = [
                _skeleton_to_dict(skeleton)
                for skeleton in xx.skeletons
            ]
            xx.labeled_frames
            return {
                'skeletons': skeletons,
                'success': True
            }, b''

def _full_path_from_uri(uri: str, *, dir: str) -> str:
    if uri.startswith('$dir'):
        uri = f'{dir}/{uri[len("$dir"):]}'
    if not uri.startswith('rtcshare://'):
        raise Exception(f'Invalid uri: {uri}')
    relpath = uri[len('rtcshare://'):]
    fullpath = os.path.join(os.environ['RTCSHARE_DIR'], relpath)
    return fullpath

def _is_valid_path(path: str) -> bool:
    if not path.startswith('/'):
        return False
    if len(path) > 10000:
        return False
    return True