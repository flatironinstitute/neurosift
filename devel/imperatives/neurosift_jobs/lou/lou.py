from dendro.client import (
    submit_job,
    DendroJobRequiredResources,
    DendroJobDefinition,
    DendroJobInputFile,
    DendroJobOutputFile,
    DendroJobParameter,
)


def submit_multiscale_spike_density_job(
    *, dandiset_id: str, nwb_url: str, units_path: str
):
    tags = ["neurosift", "multiscale_spike_density", f"dandiset:{dandiset_id}"]
    required_resources = DendroJobRequiredResources(
        numCpus=1, numGpus=0, memoryGb=4, timeSec=60 * 60 * 1
    )
    job_definition = DendroJobDefinition(
        appName="hello_neurosift",
        processorName="multiscale_spike_density",
        inputFiles=[
            DendroJobInputFile(
                name="input",
                fileBaseName="input.nwb",
                url=nwb_url,
            )
        ],
        outputFiles=[
            DendroJobOutputFile(
                name="output",
                fileBaseName="output.lindi.tar",
            )
        ],
        parameters=[
            DendroJobParameter(name="units_path", value=units_path),
            DendroJobParameter(name="bin_size_msec", value=10),
        ],
    )
    job = submit_job(
        service_name="neurosift",
        job_definition=job_definition,
        required_resources=required_resources,
        target_compute_client_ids=["*"],
        tags=tags,
        skip_cache=False,
        rerun_failing=False,
        delete_failing=False,
    )
    print(f'Job {job.jobId} submitted - status: {job.status}')


def submit_rastermap_job(
    *, dandiset_id: str, nwb_url: str, units_path: str
):
    tags = ["neurosift", "rastermap", f"dandiset:{dandiset_id}"]
    required_resources = DendroJobRequiredResources(
        numCpus=1, numGpus=0, memoryGb=4, timeSec=60 * 60 * 1
    )
    job_definition = DendroJobDefinition(
        appName="hello_rastermap",
        processorName="rastermap",
        inputFiles=[
            DendroJobInputFile(
                name="input",
                fileBaseName="input.nwb",
                url=nwb_url,
            )
        ],
        outputFiles=[
            DendroJobOutputFile(
                name="output",
                fileBaseName="output.json",
            )
        ],
        parameters=[
            DendroJobParameter(name="units_path", value=units_path),
            DendroJobParameter(name="n_clusters", value=10),
            DendroJobParameter(name="n_PCs", value=3),
            DendroJobParameter(name="locality", value=1),
            DendroJobParameter(name="grid_upsample", value=1),
        ],
    )
    job = submit_job(
        service_name="neurosift",
        job_definition=job_definition,
        required_resources=required_resources,
        target_compute_client_ids=["*"],
        tags=tags,
        skip_cache=False,
        rerun_failing=False,
        delete_failing=False,
    )
    print(f'Job {job.jobId} submitted - status: {job.status}')


def submit_image_series_to_mp4_job(
    *, dandiset_id: str, nwb_url: str, path: str, duration_sec: int
):
    tags = ["neurosift", "image_series_to_mp4", f"dandiset:{dandiset_id}"]
    required_resources = DendroJobRequiredResources(
        numCpus=1, numGpus=0, memoryGb=4, timeSec=60 * 60 * 1
    )
    job_definition = DendroJobDefinition(
        appName="hello_neurosift",
        processorName="image_series_to_mp4",
        inputFiles=[
            DendroJobInputFile(
                name="input",
                fileBaseName="input.nwb",
                url=nwb_url,
            )
        ],
        outputFiles=[
            DendroJobOutputFile(
                name="output",
                fileBaseName="output.mp4",
            )
        ],
        parameters=[
            DendroJobParameter(name="image_series_path", value=path),
            DendroJobParameter(name="duration_sec", value=duration_sec),
        ],
    )
    job = submit_job(
        service_name="neurosift",
        job_definition=job_definition,
        required_resources=required_resources,
        target_compute_client_ids=["*"],
        tags=tags,
        skip_cache=False,
        rerun_failing=False,
        delete_failing=False,
    )
    print(f'Job {job.jobId} submitted - status: {job.status}')
