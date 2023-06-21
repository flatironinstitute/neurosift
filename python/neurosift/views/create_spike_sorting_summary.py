from typing import Union
import os
import json
import numpy as np
import numpy.typing as npt
import zarr
from .helpers.compute_templates import compute_templates
from .helpers.compute_correlogram_data import compute_correlogram_data
from .helpers.extract_snippets import extract_snippets_in_channel_neighborhood


def create_spike_sorting_summary(*,
    recording,
    sorting,
    output_path: str,
    unit_ids: list,
    num_channels_per_neighborhood: int
):
    if not output_path.endswith('.ns-sps'):
        raise Exception('Output path must end with .ns-sps')

    import spikeinterface as si

    recording: si.BaseRecording = recording
    sorting: si.BaseSorting = sorting

    print(f'Creating spike sorting summary...')
    print(f'Output path: {output_path}')

    unit_ids = serialize_ids(unit_ids)
    channel_ids = serialize_ids(recording.get_channel_ids())

    # require that output folder does not exist
    if os.path.exists(output_path):
        raise Exception(f'Output folder already exists: {output_path}')
    
    # create the output folder
    os.makedirs(output_path)

    # Extracting traces
    traces = recording.get_traces()
    
    # compute full templates
    print('Computing full templates...')
    full_templates = compute_templates(traces=traces, sorting=sorting)

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
    
    for unit_id in unit_ids:
        print(f'Processing unit {unit_id}...')
        unit_folder = f'{output_path}/units/{unit_id}'
        os.makedirs(unit_folder)
        channel_neighborhood = [x for x in channel_neighborhoods if x['unit_id'] == unit_id][0]
        spike_times = sorting.get_unit_spike_train(unit_id, segment_index=0)
        spike_times_sec = spike_times / recording.get_sampling_frequency()
        autocorrelogram = compute_correlogram_data(sorting=sorting, unit_id1=unit_id, window_size_msec=100, bin_size_msec=1)
        snippets_in_neighborhood = extract_snippets_in_channel_neighborhood(traces=traces, times=spike_times, neighborhood=channel_neighborhood["channel_indices"], T1=30, T2=30)
            
        channel_neighborhood_indices = channel_neighborhood['channel_indices']
        channel_locations_in_neighborhood = np.array(recording.get_channel_locations())[channel_neighborhood_indices]

        average_waveform_in_neighborhood = np.median(snippets_in_neighborhood, axis=0)

        # spike amplitudes
        peak_channel_index_in_neighborhood = np.argmin(np.min(average_waveform_in_neighborhood, axis=0))
        spike_amplitudes = np.min(snippets_in_neighborhood[:, :, peak_channel_index_in_neighborhood], axis=1)

        # write unit_info.json
        unit_info = {
            'channel_neighborhood_ids': channel_neighborhood['channel_ids'],
            'channel_neighborhood_locations': serialize_channel_locations(channel_locations_in_neighborhood),
            'peak_channel_id': channel_neighborhood['peak_channel_id'],
            'num_events': len(spike_times)
        }
        print(f'  Num. channels in neighborhood: {len(channel_neighborhood["channel_ids"])}')
        print(f'  Peak channel: {channel_neighborhood["peak_channel_id"]}')
        print(f'  Num. events: {len(spike_times)}')
        with open(f'{unit_folder}/unit_info.json', 'w') as f:
            json.dump(unit_info, f, indent=2)
        # open data.zarr
        data_zarr_fname = f'{unit_folder}/data.zarr'
        data_zarr_root_group = zarr.open(data_zarr_fname, mode="w")
        data_zarr_root_group.create_dataset("spike_times", data=spike_times_sec.astype(np.float32), chunks=(100000,))
        data_zarr_root_group.create_dataset("average_waveform_in_neighborhood", data=average_waveform_in_neighborhood.astype(np.float32), chunks=(1000, 1000))
        data_zarr_root_group.create_dataset("autocorrelogram_bin_edges_sec", data=autocorrelogram['bin_edges_sec'], chunks=(1000,))
        data_zarr_root_group.create_dataset("autocorrelogram_bin_counts", data=autocorrelogram['bin_counts'], chunks=(1000,))
        data_zarr_root_group.create_dataset("snippets_in_neighborhood", data=snippets_in_neighborhood.astype(np.float32), chunks=(1000, 100, 50))
        data_zarr_root_group.create_dataset("spike_amplitudes", data=spike_amplitudes.astype(np.float32), chunks=(10000,))

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
    # Choose the best 3 correlations for each unit
    unit_pair_ids = []
    for unit_id in unit_ids:
        correlations = [x for x in all_correlations if x['unit_id1'] == unit_id]
        correlations = sorted(correlations, key=lambda x: x['correlation'], reverse=True)
        for i in range(min(3, len(correlations))):
            unit_pair_ids.append([correlations[i]['unit_id1'], correlations[i]['unit_id2']])
    print(f'Using {len(unit_pair_ids)} unit pairs for similarity comparison.')

    for unit_pair_id in unit_pair_ids:
        print(f'Processing unit pair {unit_pair_id}...')
        unit_pair_id_str = f'{unit_pair_id[0]}-{unit_pair_id[1]}'
        unit_pair_folder = f'{output_path}/unit_pairs/{unit_pair_id_str}'
        os.makedirs(unit_pair_folder)
        # use the union of the two channel neighborhoods
        unit1_channel_neighborhood = [x for x in channel_neighborhoods if x['unit_id'] == unit_pair_id[0]][0]
        unit2_channel_neighborhood = [x for x in channel_neighborhoods if x['unit_id'] == unit_pair_id[1]][0]
        channel_neighborhood_channel_indices = np.union1d(unit1_channel_neighborhood['channel_indices'], unit2_channel_neighborhood['channel_indices'])
        channel_neighborhood_channel_ids = [channel_ids[i] for i in channel_neighborhood_channel_indices]
        spike_times_1 = sorting.get_unit_spike_train(unit_pair_id[0], segment_index=0)
        spike_times_2 = sorting.get_unit_spike_train(unit_pair_id[1], segment_index=0)
        spike_times_sec_1 = spike_times_1 / recording.get_sampling_frequency()
        spike_times_sec_2 = spike_times_2 / recording.get_sampling_frequency()
        cross_correlogram = compute_correlogram_data(sorting=sorting, unit_id1=unit_pair_id[0], unit_id2=unit_pair_id[1], window_size_msec=100, bin_size_msec=1)
        channel_locations_in_neighborhood = np.array(recording.get_channel_locations())[channel_neighborhood_channel_indices]

        snippets_1_in_neighborhood = extract_snippets_in_channel_neighborhood(traces=traces, times=spike_times_1, neighborhood=channel_neighborhood_channel_indices, T1=30, T2=30)
        snippets_2_in_neighborhood = extract_snippets_in_channel_neighborhood(traces=traces, times=spike_times_2, neighborhood=channel_neighborhood_channel_indices, T1=30, T2=30)

        average_waveform_1_in_neighborhood = np.median(snippets_1_in_neighborhood, axis=0)
        average_waveform_2_in_neighborhood = np.median(snippets_2_in_neighborhood, axis=0)

        V1s = snippets_1_in_neighborhood.reshape((snippets_1_in_neighborhood.shape[0], snippets_1_in_neighborhood.shape[1] * snippets_1_in_neighborhood.shape[2]))
        V2s = snippets_2_in_neighborhood.reshape((snippets_2_in_neighborhood.shape[0], snippets_2_in_neighborhood.shape[1] * snippets_2_in_neighborhood.shape[2]))

        V1_mean = np.mean(V1s, axis=0)
        V2_mean = np.mean(V2s, axis=0)

        # direction of discrimination
        direction_of_discrimination = (V2_mean - V1_mean) / np.linalg.norm(V2_mean - V1_mean)

        # inner products with direction of discrimination
        discrimination_features_1 = np.dot(V1s, direction_of_discrimination)
        discrimination_features_2 = np.dot(V2s, direction_of_discrimination)

        # subtract off the direction of discrimination
        V1s_orth = V1s - np.outer(discrimination_features_1, direction_of_discrimination)
        V2s_orth = V2s - np.outer(discrimination_features_2, direction_of_discrimination)

        # find the first principal component of the union of V1s_orth and V2s_orth
        V1s_orth_V2s_orth = np.concatenate((V1s_orth, V2s_orth), axis=0)
        U, S, Vh = np.linalg.svd(V1s_orth_V2s_orth, full_matrices=False)
        pca_features_1 = np.dot(V1s_orth, Vh[0, :])
        pca_features_2 = np.dot(V2s_orth, Vh[0, :])
        
        # spike amplitudes
        peak_channel_index_1_in_neighborhood = np.argmin(np.min(average_waveform_1_in_neighborhood, axis=0))
        spike_amplitudes_1 = np.min(snippets_1_in_neighborhood[:, :, peak_channel_index_1_in_neighborhood], axis=1)
        peak_channel_index_2_in_neighborhood = np.argmin(np.min(average_waveform_2_in_neighborhood, axis=0))
        spike_amplitudes_2 = np.min(snippets_2_in_neighborhood[:, :, peak_channel_index_2_in_neighborhood], axis=1)

        # write unit_pair_info.json
        unit_pair_info = {
            'channel_neighborhood_ids': channel_neighborhood_channel_ids,
            'channel_neighborhood_locations': serialize_channel_locations(channel_locations_in_neighborhood),
            'num_events_1': len(spike_times_1),
            'num_events_2': len(spike_times_2),
            'unit_id1': unit_pair_id[0],
            'unit_id2': unit_pair_id[1],
        }
        print(f'  Num. channels in joint neighborhood: {len(channel_neighborhood_channel_ids)}')
        print(f'  Num. events 1: {len(spike_times_1)}')
        print(f'  Num. events 2: {len(spike_times_2)}')
        with open(f'{unit_pair_folder}/unit_pair_info.json', 'w') as f:
            json.dump(unit_pair_info, f, indent=2)
        # open data.zarr
        data_zarr_fname = f'{unit_pair_folder}/data.zarr'
        data_zarr_root_group = zarr.open(data_zarr_fname, mode="w")
        data_zarr_root_group.create_dataset("spike_times_1", data=spike_times_sec_1.astype(np.float32), chunks=(100000,))
        data_zarr_root_group.create_dataset("spike_times_2", data=spike_times_sec_2.astype(np.float32), chunks=(100000,))
        data_zarr_root_group.create_dataset("average_waveform_1_in_neighborhood", data=average_waveform_1_in_neighborhood.astype(np.float32), chunks=(1000, 1000))
        data_zarr_root_group.create_dataset("average_waveform_2_in_neighborhood", data=average_waveform_2_in_neighborhood.astype(np.float32), chunks=(1000, 1000))
        data_zarr_root_group.create_dataset("cross_correlogram_bin_edges_sec", data=cross_correlogram['bin_edges_sec'], chunks=(1000,))
        data_zarr_root_group.create_dataset("cross_correlogram_bin_counts", data=cross_correlogram['bin_counts'], chunks=(1000,))
        data_zarr_root_group.create_dataset("discrimination_features_1", data=discrimination_features_1.astype(np.float32), chunks=(10000,))
        data_zarr_root_group.create_dataset("discrimination_features_2", data=discrimination_features_2.astype(np.float32), chunks=(10000,))
        data_zarr_root_group.create_dataset("pca_features_1", data=pca_features_1.astype(np.float32), chunks=(10000,))
        data_zarr_root_group.create_dataset("pca_features_2", data=pca_features_2.astype(np.float32), chunks=(10000,))
        data_zarr_root_group.create_dataset("spike_amplitudes_1", data=spike_amplitudes_1.astype(np.float32), chunks=(10000,))
        data_zarr_root_group.create_dataset("spike_amplitudes_2", data=spike_amplitudes_2.astype(np.float32), chunks=(10000,))

    # create spike_sorting_summary_info.json
    spike_sorting_sumary_info = {
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
    print(f'Num. frames: {spike_sorting_sumary_info["num_frames"]}')
    with open(f'{output_path}/spike_sorting_summary_info.json', 'w') as f:
        json.dump(spike_sorting_sumary_info, f, indent=2)

    print('Done creating spike sorting summary.')

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