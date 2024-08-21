# Spike sorting (under construction)

The goal here is to be able to launch spike sorting directly from within the Neurosift UI, monitor the job progress, and visualize the results. This is still at a very early stage of development, so it is not meant for practical use yet.

First, load a DANDI NWB file in Neurosift. For example:

https://neurosift.app/?p=/nwb&url=https://api.dandiarchive.org/api/assets/2e6b590a-a2a4-4455-bb9b-45cc3d7d7cc0/download/&dandisetId=000463&dandisetVersion=draft

Navigate to the raw ephys data by clicking on acquisition -> ElectricalSeries (it might be named slightly differently depending on the dataset). Click the "Spike Sorting WIP" tab.

If a spike sorting job has already run, you will see a link "View in Neurosift" where you can view the output of the spike sorting. If you want to try out running spike sorting, you will need to find a dataset that does not have spike sorting results yet. You can browse for one [here](https://neurosift.app/?p=/dandiset&dandisetId=000463&dandisetVersion=draft).

To submit a spike sorting job, click the "SUBMIT JOB" button. You will need to enter your DENDRO API key and optionally the compute client ID. If you do not specify a compute client, then public resources will be used if available. But let's assume that you want to use your own computer for running the spike sorting. Configure and run your own compute client using the instructions below and then enter the client ID in the form. Click "SUBMIT JOB" again and your job will be submitted. It should appear in the "pending" state.

You can use the refresh icon button to refresh the job status. If everything is set up properly, the job will go to the "starting" status, which is when the docker image is being downloaded. Then it will go to the "running" status, which is when the spike sorting is actually running. You can click on the job to see the console output and progress of the job. Once the job is finished, the status will change to "completed" and you will see a link to view the output in Neurosift.

## Running your own compute client

By running a compute client on your computer, you are allowing Neurosift to send jobs to your computer for running spike sorting and other compute-intensive tasks.

NOTE: In order for this to work, your GitHub user will need to have permission to process jobs on the hello_world_service service. Reach out to the Neurosift maintainers if you would like to be added to this service.

Prerequisites: Python 3.7 or later and Docker. It is also possible to use apptainer instead of Docker, but the instructions here assume you are using Docker.

First install dendro

```bash
pip install --upgrade dendro
```

Then create a new directory for your compute client

```bash
mkdir dendro_compute_client
cd dendro_compute_client
```

Register the compute client

```bash
dendro register-compute-client
```

When prompted for the service name, enter "hello_world_service".

Click the link to complete the configuration. You will be redirected to a page where you can log in using GitHub and authorize the compute client.

IMPORTANT: By default, your compute client will process jobs from anyone who does not explicitly specify a compute client. If you want to restrict your compute client to only process jobs from specific users (for example you), then click on the link in the terminal where it says "You can configure it here..." Click the edit button for "Process jobs for users", and enter your GitHub user name (or a list of user user names).


Finally, start the compute client

```bash
dendro start-compute-client
```

You should see a message with your client ID. Copy this ID and use it to submit jobs in Neurosift.