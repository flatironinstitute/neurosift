FROM python:3.9

# Install ffmpeg
RUN apt-get update && apt-get install -y ffmpeg

# conda is needed so we can install the opencv on conda-forge which supports writing videos with avc1 codec
# Install Miniforge (do not use miniconda due to licensing issues)
RUN wget https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-Linux-x86_64.sh -O /tmp/miniforge.sh \
    && bash /tmp/miniforge.sh -b -p /opt/conda \
    && rm /tmp/miniforge.sh
ENV PATH=/opt/conda/bin:$PATH

# Install a conda package (example: numpy)
RUN pip uninstall opencv-python -y
RUN conda install -y -c conda-forge opencv

# Copy the package files
COPY pyproject.toml /app/
COPY src /app/src/

# Install the package and its dependencies
RUN pip install --no-cache-dir -e .

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Set the entry point to the CLI command
ENTRYPOINT ["neurosift-job-runner-2"]
