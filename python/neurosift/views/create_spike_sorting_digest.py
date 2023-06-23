from typing import Union
import os
import json
import numpy as np
import numpy.typing as npt
import zarr
from .helpers.compute_templates import compute_templates
from .helpers.compute_correlogram_data import compute_correlogram_data
from .helpers.extract_snippets import extract_snippets_in_channel_neighborhood
from .SpikeTrains import SpikeTrains, SpikeTrain
from .Autocorrelograms import create_autocorrelograms
from .CrossCorrelograms import create_cross_correlograms
from .AverageWaveforms import AverageWaveforms, AverageWaveformItem

def create_spike_sorting_digest(*,
    recording,
    sorting,
    output_path: str,
    num_channels_per_neighborhood: int,
    subsample_segment_duration_sec: float,
    subsample_total_duration_sec: float
):
    if not output_path.endswith('.ns-ssd'):
        raise Exception('Output path must end with .ns-ssd')
    
    print(f'Creating spike sorting digest...')
    print(f'Output path: {output_path}')

    # require that output folder does not exist
    if os.path.exists(output_path):
        raise Exception(f'Output folder already exists: {output_path}')
    
    # create the output folder
    os.makedirs(output_path)
    
    import spikeinterface as si

    recording: si.BaseRecording = recording
    sorting: si.BaseSorting = sorting

    unit_ids = serialize_ids(sorting.get_unit_ids())
    channel_ids = serialize_ids(recording.get_channel_ids())

    print('Creating autocorrelograms.ns-acg...')
    create_autocorrelograms(
        sorting=sorting,
        output_path=f'{output_path}/autocorrelograms.ns-acg',
    )

    print(f'Creating spike_trains.ns-spt...')
    spike_trains: list[SpikeTrain] = []
    for unit_id in unit_ids:
        spike_times = sorting.get_unit_spike_train(unit_id, segment_index=0)
        spike_trains.append(SpikeTrain(
            unit_id=unit_id,
            spike_times_sec=spike_times.astype(np.float32)
        ))
    X = SpikeTrains(
        start_time_sec=0,
        end_time_sec=recording.get_num_frames() / recording.get_sampling_frequency(),
        spike_trains=spike_trains
    )
    X.save(f'{output_path}/spike_trains.ns-spt', block_size_sec=300)

    data_zarr_fname = f'{output_path}/data.zarr'
    data_zarr_root_group = zarr.open(data_zarr_fname, mode="w")

    # Extracting subsampled traces
    print('Extracting subsampled traces...')
    subsampled_traces = get_subsampled_traces(
        recording=recording,
        segment_duration_sec=subsample_segment_duration_sec,
        total_duration_sec=subsample_total_duration_sec
    )

    # Writing subsampled traces
    print('Writing subsampled traces...')
    data_zarr_root_group.create_dataset("subsampled_traces", data=subsampled_traces, chunks=(1000000, len(channel_ids)))

    # Creating subsampled sorting
    print('Creating subsampled sorting...')
    subsampled_sorting = get_subsampled_sorting(
        recording=recording,
        sorting=sorting,
        segment_duration_sec=subsample_segment_duration_sec,
        total_duration_sec=subsample_total_duration_sec
    )

    # Creating subsampled_spike_trains.ns-spt
    print('Creating subsampled_spike_trains.ns-spt...')
    spike_trains: list[SpikeTrain] = []
    for unit_id in unit_ids:
        spike_times = subsampled_sorting.get_unit_spike_train(unit_id, segment_index=0)
        spike_trains.append(SpikeTrain(
            unit_id=unit_id,
            spike_times_sec=spike_times.astype(np.float32)
        ))
    X = SpikeTrains(
        start_time_sec=0,
        end_time_sec=subsample_total_duration_sec,
        spike_trains=spike_trains
    )
    X.save(f'{output_path}/subsampled_spike_trains.ns-spt', block_size_sec=300)

    # Computing full templates
    print('Computing full templates...')
    full_templates = compute_templates(traces=subsampled_traces, sorting=subsampled_sorting)

    # Writing full templates
    print('Writing full templates...')
    data_zarr_root_group.create_dataset("full_templates", data=full_templates, chunks=(1000, 1000, len(channel_ids)))

    # determine peak channels from full templates
    print('Determining peak channels...')
    peak_channel_indices = np.argmin(np.min(full_templates, axis=1), axis=1)
    peak_channel_ids = [channel_ids[i] for i in peak_channel_indices]

    # determine channel neighborhoods from channel locations and peak channels
    print('Determining channel neighborhoods...')
    channel_neighborhoods = []
    for i, unit_id in enumerate(unit_ids):
        peak_channel_id = peak_channel_ids[i]
        peak_channel_index = channel_ids.index(peak_channel_id)
        channel_locations = recording.get_channel_locations()
        peak_channel_location = channel_locations[peak_channel_index]
        channel_distances = np.linalg.norm(channel_locations - peak_channel_location, axis=1)
        # use the closest num_channels_per_neighborhood channels
        channel_neighborhood_indices = np.argsort(channel_distances)[:num_channels_per_neighborhood]
        channel_neighborhood = [channel_ids[i] for i in channel_neighborhood_indices]
        channel_neighborhoods.append({
            'unit_id': unit_id,
            'channel_ids': channel_neighborhood,
            'channel_indices': channel_neighborhood_indices,
            'peak_channel_id': peak_channel_id
        })

    avg_waveforms_list: list[AverageWaveformItem] = []
    
    for unit_id in unit_ids:
        print(f'Processing unit {unit_id}...')
        unit_folder = f'{output_path}/units/{unit_id}'
        os.makedirs(unit_folder)

        channel_neighborhood = [x for x in channel_neighborhoods if x['unit_id'] == unit_id][0]
        subsampled_spike_times = subsampled_sorting.get_unit_spike_train(unit_id, segment_index=0)
        subsampled_snippets_in_neighborhood = extract_snippets_in_channel_neighborhood(traces=subsampled_traces, times=subsampled_spike_times, neighborhood=channel_neighborhood["channel_indices"], T1=30, T2=30)

        channel_neighborhood_indices = channel_neighborhood['channel_indices']
        channel_locations_in_neighborhood = np.array(recording.get_channel_locations())[channel_neighborhood_indices]

        average_waveform_in_neighborhood = np.median(subsampled_snippets_in_neighborhood, axis=0)

        # spike amplitudes
        peak_channel_index_in_neighborhood = np.argmin(np.min(average_waveform_in_neighborhood, axis=0))
        subsampled_spike_amplitudes = np.min(subsampled_snippets_in_neighborhood[:, :, peak_channel_index_in_neighborhood], axis=1)

        # write unit_info.json
        unit_info = {
            'channel_neighborhood_ids': channel_neighborhood['channel_ids'],
            'channel_neighborhood_locations': serialize_channel_locations(channel_locations_in_neighborhood),
            'peak_channel_id': channel_neighborhood['peak_channel_id'],
            'num_subsampled_events': len(subsampled_spike_times)
        }
        print(f'  Num. channels in neighborhood: {len(channel_neighborhood["channel_ids"])}')
        print(f'  Peak channel: {channel_neighborhood["peak_channel_id"]}')
        print(f'  Num. subsampled events: {len(subsampled_spike_times)}')
        with open(f'{unit_folder}/unit_info.json', 'w') as f:
            json.dump(unit_info, f, indent=2)
        # open data.zarr
        unit_data_zarr_fname = f'{unit_folder}/data.zarr'
        unit_data_zarr_root_group = zarr.open(unit_data_zarr_fname, mode="w")
        unit_data_zarr_root_group.create_dataset("subsampled_spike_times", data=subsampled_spike_times.astype(np.float32), chunks=(100000,))
        unit_data_zarr_root_group.create_dataset("average_waveform_in_neighborhood", data=average_waveform_in_neighborhood.astype(np.float32), chunks=(1000, 1000))
        unit_data_zarr_root_group.create_dataset("subsampled_snippets_in_neighborhood", data=subsampled_snippets_in_neighborhood.astype(np.float32), chunks=(1000, 100, 50))
        unit_data_zarr_root_group.create_dataset("subsampled_spike_amplitudes", data=subsampled_spike_amplitudes.astype(np.float32), chunks=(10000,))

        avg_waveforms_list.append(AverageWaveformItem(
            unit_id=unit_id,
            channel_ids=channel_neighborhood['channel_ids'],
            waveform=average_waveform_in_neighborhood
        ))
    
    # Writing average_waveforms.awf
    print('Writing average_waveforms.ns-awf...')
    channel_locations_dict = {}
    for i in range(len(channel_ids)):
        channel_locations_dict[str(channel_ids[i])] = recording.get_channel_locations()[i, :].tolist()
    X_avg_waveforms = AverageWaveforms(
        average_waveforms=avg_waveforms_list,
        channel_locations=channel_locations_dict
    )
    X_avg_waveforms.save(f'{output_path}/average_waveforms.ns-awf')
    
    # Computing unit template correlations
    print('Computing unit template correlations...')
    all_correlations = []
    for i, unit_id1 in enumerate(unit_ids):
        template1 = full_templates[i, :, :]
        for j, unit_id2 in enumerate(unit_ids):
            if j <= i:
                continue
            template2 = full_templates[j, :, :]
            correlation = np.corrcoef(template1.ravel(), template2.ravel())[0, 1]
            all_correlations.append({
                'unit_id1': unit_id1,
                'unit_id2': unit_id2,
                'correlation': correlation
            })
    kk = 20
    # Choose the best kk correlations for each unit
    unit_pair_ids = []
    for unit_id in unit_ids:
        correlations = [x for x in all_correlations if x['unit_id1'] == unit_id]
        correlations = sorted(correlations, key=lambda x: x['correlation'], reverse=True)
        for i in range(min(kk, len(correlations))):
            unit_pair_ids.append([correlations[i]['unit_id1'], correlations[i]['unit_id2']])
    print(f'Using {len(unit_pair_ids)} unit pairs for similarity comparison.')

    # Creating cross_correlograms.ccg
    print('Creating cross_correlograms.ns-ccg...')
    create_cross_correlograms(
        sorting=subsampled_sorting,
        unit_pairs=unit_pair_ids,
        output_path=f'{output_path}/cross_correlograms.ns-ccg'
    )

    # create spike_sorting_digest_info.json
    spike_sorting_digest_info = {
        'channel_ids': channel_ids,
        'sampling_frequency': float(recording.get_sampling_frequency()),
        'num_frames': int(recording.get_num_frames()),
        'unit_ids': unit_ids,
        'unit_pair_ids': unit_pair_ids,
        'channel_locations': serialize_channel_locations(recording.get_channel_locations())
    }
    print(f'Num. channels: {len(channel_ids)}')
    print(f'Num. units: {len(unit_ids)}')
    print(f'Num. unit pairs: {len(unit_pair_ids)}')
    print(f'Num. frames: {spike_sorting_digest_info["num_frames"]}')
    with open(f'{output_path}/spike_sorting_digest_info.json', 'w') as f:
        json.dump(spike_sorting_digest_info, f, indent=2)

    print('Done creating spike sorting digest.')

def get_chunk_sizes_and_spacing(*,
    num_frames: int,
    sampling_frequency: float,
    segment_duration_sec: float,
    total_duration_sec: float
):
    if total_duration_sec * sampling_frequency >= num_frames:
        # if the total duration is longer than the recording, then just use the entire recording
        return [num_frames], 0
    
    # use chunks of segment_duration_sec seconds
    chunk_size = int(sampling_frequency * min(segment_duration_sec, total_duration_sec))
    # the number of chunks depends on the total duration
    num_chunks = int(np.ceil(total_duration_sec * sampling_frequency / chunk_size))
    chunk_sizes = [chunk_size for i in range(num_chunks)]
    chunk_sizes[-1] = int(total_duration_sec * sampling_frequency - (num_chunks - 1) * chunk_size)
    if num_chunks == 1:
        # if only 1 chunk, then just use the initial chunk
        return chunk_sizes, 0
    else:
        # the spacing between the chunks
        spacing = int((num_frames - np.sum(chunk_sizes)) / (num_chunks - 1))
        return chunk_sizes, spacing

def get_subsampled_traces(
    recording, *,
    segment_duration_sec: float,
    total_duration_sec: float
) -> npt.NDArray:
    import spikeinterface as si

    recording: si.BaseRecording = recording

    chunk_sizes, spacing = get_chunk_sizes_and_spacing(
        num_frames=recording.get_num_frames(),
        sampling_frequency=recording.sampling_frequency,
        segment_duration_sec=segment_duration_sec,
        total_duration_sec=total_duration_sec
    )

    num_chunks = len(chunk_sizes)
    if num_chunks == 1:
        # if only 1 chunk, then just use the initial chunk
        traces = recording.get_traces(start_frame=0, end_frame=int(total_duration_sec * recording.sampling_frequency))
    else:
        traces_list: list[np.ndarray] = []
        tt = 0
        for i in range(num_chunks):
            start_frame = tt
            end_frame = int(start_frame + chunk_sizes[i])
            traces_list.append(recording.get_traces(start_frame=start_frame, end_frame=end_frame))
            tt += int(chunk_sizes[i] + spacing)
        traces = np.concatenate(traces_list, axis=0)
    return traces

def get_subsampled_sorting(
    sorting, *,
    recording,
    segment_duration_sec: float,
    total_duration_sec: float,
    margin_num_frames: int = 100
):
    import spikeinterface as si
    
    sorting: si.BaseSorting = sorting
    recording: si.BaseRecording = recording

    chunk_sizes, spacing = get_chunk_sizes_and_spacing(
        num_frames=recording.get_num_frames(),
        sampling_frequency=recording.sampling_frequency,
        segment_duration_sec=segment_duration_sec,
        total_duration_sec=total_duration_sec
    )

    spike_trains_dict = {}
    for unit_id in sorting.get_unit_ids():
        st = sorting.get_unit_spike_train(unit_id, segment_index=0)
        spike_times_list = []
        t_offset = 0
        for i in range(len(chunk_sizes)):
            start_frame = int(i * (chunk_sizes[i] + spacing))
            end_frame = int(start_frame + chunk_sizes[i])
            spike_times_list.append(st[(st >= start_frame + margin_num_frames) & (st < end_frame - margin_num_frames)] - start_frame + t_offset)
            t_offset += chunk_sizes[i]
        spike_times = np.concatenate(spike_times_list)
        spike_trains_dict[unit_id] = spike_times

    return si.NumpySorting.from_dict(
        [spike_trains_dict],
        sampling_frequency=recording.sampling_frequency
    )

def serialize_ids(ids: Union[list, npt.NDArray]) -> list:
    return [id if isinstance(id, str) else int(id) for id in ids]

def serialize_channel_locations(channel_locations: npt.NDArray) -> list:
    ret = []
    for m in range(channel_locations.shape[0]):
        ret.append({
            'x': float(channel_locations[m, 0]),
            'y': float(channel_locations[m, 1])
        })
    return ret