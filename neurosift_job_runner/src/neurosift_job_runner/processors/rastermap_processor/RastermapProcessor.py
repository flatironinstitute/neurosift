import json
import numpy as np
from pydantic import BaseModel, Field
from ...job_utils import InputFile, OutputFile


class RastermapContext(BaseModel):
    input: InputFile = Field(
        description="Input NWB file in .nwb or .nwb.lindi.tar format"
    )
    output: OutputFile = Field(description="Output data in .json format")
    units_path: str = Field(description="Path to the units table in the NWB file")
    n_clusters: int = Field(
        description="Number of clusters to use in Rastermap. 0 means None."
    )
    n_PCs: int = Field(description="Number of principal components to use in Rastermap")
    locality: float = Field(
        description="Locality in sorting to find sequences (this is a value from 0 to 1)"
    )
    grid_upsample: int = Field(description="10 is good for large recordings")


class RastermapProcessor:
    name = "rastermap"
    description = "Compute the sorting order of units using Rastermap"
    label = "rastermap"
    attributes = {}

    @staticmethod
    def run(context: RastermapContext):
        import lindi
        from scipy.stats import zscore
        from rastermap import Rastermap

        units_path = context.units_path
        n_clusters = context.n_clusters
        n_PCs = context.n_PCs
        locality = context.locality
        grid_upsample = context.grid_upsample

        input_file = context.input
        url = input_file.get_url()
        assert url

        # should we make this adjustable?
        bin_size_msec = 100
        bin_size_sec = bin_size_msec / 1000

        if input_file.file_base_name.endswith(
            ".lindi.json"
        ) or input_file.file_base_name.endswith(".lindi.tar"):
            f = lindi.LindiH5pyFile.from_lindi_file(url)
        else:
            f = lindi.LindiH5pyFile.from_hdf5_file(url)

        # Load the spike data
        spike_times: np.ndarray = f[f"{units_path}/spike_times"][()]  # type: ignore
        spike_times_index: np.ndarray = f[f"{units_path}/spike_times_index"][()]  # type: ignore
        spike_trains = []
        offset = 0
        for i in range(len(spike_times_index)):
            st = spike_times[offset : int(spike_times_index[i])]
            # exclude the NaN from the spike times
            st = st[~np.isnan(st)]
            spike_trains.append(st)
            offset = int(spike_times_index[i])
        num_units = len(spike_trains)

        f.close()

        start_time_sec = float(0)  # we assume we are starting at time 0
        # end time is the max over all the spike trains
        all_spike_times = np.concatenate(spike_trains)
        end_time_sec = float(np.max(all_spike_times))

        print(f"Start time: {start_time_sec}")
        print(f"End time: {end_time_sec}")

        firing_rates_hz = [
            len(st) / (end_time_sec - start_time_sec) for st in spike_trains
        ]

        print(f"Number of units: {num_units}")
        print(f"Total number of spikes: {sum([len(st) for st in spike_trains])}")
        for i in range(num_units):
            print(
                f"Unit {i}: {len(spike_trains[i])} spikes, {firing_rates_hz[i]:.2f} Hz"
            )

        num_bins = int((end_time_sec - start_time_sec) / bin_size_sec)
        print(f"Number of bins: {num_bins}")

        print("Binning spikes...")
        spike_counts = np.zeros((num_bins, num_units), dtype=np.int32)
        for i in range(num_units):
            spike_counts[:, i], _ = np.histogram(
                spike_trains[i], bins=num_bins, range=(start_time_sec, end_time_sec)
            )

        print("Z-scoring the spike counts...")
        spks = spike_counts.T
        spks = zscore(spks, axis=1)

        print("Running Rastermap...")
        model = Rastermap(
            n_clusters=n_clusters if n_clusters > 0 else None,  # type: ignore
            n_PCs=n_PCs,
            locality=locality,
            grid_upsample=grid_upsample,
        ).fit(spks)
        print("Done with Rastermap")

        isort = model.isort
        print("isort:", isort)

        ret = {"isort": [int(val) for val in isort]}

        output_fname = "output.json"
        with open(output_fname, "w") as f:
            f.write(json.dumps(ret))

        context.output.upload(output_fname)
