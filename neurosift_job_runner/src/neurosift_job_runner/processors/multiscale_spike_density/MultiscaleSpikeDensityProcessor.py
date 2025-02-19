import numpy as np
from pydantic import BaseModel, Field
from ...job_utils import InputFile, OutputFile


class MultiscaleSpikeDensityContext(BaseModel):
    input: InputFile = Field(
        description="Input NWB file in .nwb or .nwb.lindi.tar format"
    )
    output: OutputFile = Field(description="Output data in .lindi.tar format")
    units_path: str = Field(description="Path to the units table in the NWB file")
    bin_size_msec: float = Field(description="Bin size in milliseconds", default=20)


class MultiscaleSpikeDensityProcessor:
    name = "multiscale_spike_density"
    description = "Compute a multiscale spike density matrix from spike trains"
    label = "multiscale_spike_density"
    attributes = {}

    @staticmethod
    def run(context: MultiscaleSpikeDensityContext):
        import lindi

        units_path = context.units_path
        bin_size_msec = context.bin_size_msec
        bin_size_sec = bin_size_msec / 1000

        input = context.input
        url = input.get_url()
        assert url

        if input.file_base_name.endswith(
            ".lindi.json"
        ) or input.file_base_name.endswith(".lindi.tar"):
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

        # bin the spikes
        spike_counts = np.zeros((num_bins, num_units), dtype=np.int32)
        for i in range(num_units):
            spike_counts[:, i], _ = np.histogram(
                spike_trains[i], bins=num_bins, range=(start_time_sec, end_time_sec)
            )

        output_fname = "output.lindi.tar"
        g = lindi.LindiH5pyFile.from_lindi_file(output_fname, mode="w")

        num_bins_per_chunk = 5_000_000 // num_units

        ds = g.create_dataset(
            "spike_counts",
            data=spike_counts,
            chunks=(np.minimum(num_bins_per_chunk, num_bins), num_units),
        )
        ds.attrs["bin_size_sec"] = bin_size_sec
        ds.attrs["start_time_sec"] = start_time_sec
        ds_factor = 1
        while num_bins // ds_factor > 10000:
            rel_ds_factor = 3
            num_ds_bins = spike_counts.shape[0] // rel_ds_factor
            X = spike_counts[: num_ds_bins * rel_ds_factor, :].reshape(
                num_ds_bins, rel_ds_factor, num_units
            )
            spike_counts_ds = np.sum(X, axis=1).reshape(num_ds_bins, num_units)
            ds_factor = ds_factor * rel_ds_factor
            ds0 = g.create_dataset(
                f"spike_counts_ds_{ds_factor}",
                data=spike_counts_ds.astype(np.int32),
                chunks=(np.minimum(num_bins_per_chunk, num_ds_bins), num_units),
            )
            ds0.attrs["bin_size_sec"] = bin_size_sec * ds_factor
            ds0.attrs["start_time_sec"] = start_time_sec
            spike_counts = spike_counts_ds

        g.close()  # important

        context.output.upload(output_fname)
