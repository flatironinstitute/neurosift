import time
import os
import click
import subprocess
import webbrowser
import socket
from contextlib import closing
from .TemporaryDirectory import TemporaryDirectory
import shutil
import sys


@click.group()
def neurosift():
    pass


@click.command()
@click.argument("file", type=click.Path(exists=True))
@click.option(
    "--neurosift-url",
    default="https://neurosift.app",
    help="Neurosift server URL (default: https://neurosift.app)",
)
@click.option(
    "--video",
    "videos",
    multiple=True,
    type=click.Path(exists=True),
    help="External video file referenced by an ImageSeries external_file. "
    "Repeatable. Placed next to the NWB so it can be played locally. "
    "The filename must match the external_file basename in the NWB.",
)
def view_nwb(file: str, neurosift_url: str, videos: tuple[str, ...]):
    abs_fname = os.path.abspath(file)
    base_fname = os.path.basename(abs_fname)
    if os.path.isdir(abs_fname):
        # Earlier versions accepted a zarr directory and passed zarr=1 in the
        # URL, but the current web app has no zarr reader and dropped that
        # parameter, so the page could never load. Say so up front.
        raise click.ClickException(
            f"{abs_fname} is a directory. Zarr-backed NWB stores are not "
            "supported by this version of neurosift; pass an HDF5 (.nwb) "
            "or LINDI (.lindi.json, .lindi.tar) file."
        )
    with TemporaryDirectory(prefix="view_nwb") as tmpdir:
        if sys.platform == "win32":
            # symlinks require admin privilege on Windows - do a copy instead
            shutil.copy2(abs_fname, f"{tmpdir}/{base_fname}")
        else:
            # create a symbolic link to the file (or zarr folder)
            os.symlink(abs_fname, f"{tmpdir}/{base_fname}")

        # Place any --video files next to the NWB by basename, so an ImageSeries
        # external_file (which neurosift resolves to its basename for local files)
        # is served at /files/<basename> alongside the NWB.
        seen = {base_fname}
        for video in videos:
            video_abs = os.path.abspath(video)
            video_base = os.path.basename(video_abs)
            if video_base in seen:
                raise click.ClickException(
                    f"Duplicate video filename '{video_base}'. "
                    "Each --video must have a unique filename."
                )
            seen.add(video_base)
            target = f"{tmpdir}/{video_base}"
            if sys.platform == "win32":
                shutil.copy2(video_abs, target)
            else:
                os.symlink(video_abs, target)

        # this directory
        this_directory = os.path.dirname(os.path.realpath(__file__))

        env = os.environ.copy()

        # apparently shell=True is necessary for Windows, but shell=False is necessary for Linux
        if os.name == "nt":
            shell = True
        elif os.name == "posix":
            shell = False
        else:
            print(f"Warning: unrecognized os.name: {os.name}")
            shell = False

        try:
            npm_version = subprocess.run(
                ["npm", "--version"],
                stdout=subprocess.PIPE,
                universal_newlines=True,
                shell=shell,
                env=env,
            ).stdout.strip()
            print(f"npm version: {npm_version}")
        except Exception:
            raise Exception("Unable to run npm.")

        try:
            node_version = subprocess.run(
                ["node", "--version"],
                stdout=subprocess.PIPE,
                universal_newlines=True,
                shell=shell,
                env=env,
            ).stdout.strip()
            print(f"node version: {node_version}")
        except Exception:
            raise Exception("Unable to run node.")

        # parse node_version v18.0.0 to get the major version number
        node_major_version = int(node_version.split(".")[0][1:])
        if node_major_version < 16:
            raise Exception("node version must be >= 16.0.0")

        # install the file server's dependencies once; the directory lives
        # inside site-packages, so this only happens on first use after
        # installing or upgrading the package
        if not os.path.exists(f"{this_directory}/local-file-access-js/node_modules"):
            subprocess.run(
                ["npm", "install"],
                cwd=f"{this_directory}/local-file-access-js",
                shell=shell,
                env=env,
            )

        # find an open port
        port = find_free_port()

        # run the service
        env["PORT"] = str(port)
        process = subprocess.Popen(
            ["npm", "run", "start", tmpdir],
            cwd=f"{this_directory}/local-file-access-js",
            shell=shell,
            env=env,
        )

        # it's important to wait a bit before opening the browser
        time.sleep(3)

        # open the browser
        url = f"{neurosift_url}/?p=/nwb&url=http://localhost:{port}/files/{base_fname}"
        if (
            file.endswith(".lindi")
            or file.endswith(".lindi.tar")
            or file.endswith(".lindi.json")
        ):
            url = url + "&st=lindi"
        print(f"Opening {url}")
        webbrowser.open(url)

        # wait for the process to finish
        process.wait()


def find_free_port():
    with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as s:
        s.bind(("", 0))
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        return s.getsockname()[1]


# Add command to the neurosift group
neurosift.add_command(view_nwb)


if __name__ == "__main__":
    neurosift()
