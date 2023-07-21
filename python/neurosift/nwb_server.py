import os
import argparse
import subprocess
import tempfile
import webbrowser


def start_server(nwb_file, port):
    temp_dir = tempfile.mkdtemp()
    nwb_file_name = os.path.basename(nwb_file)
    symlink_path = os.path.join(temp_dir, nwb_file_name)

    os.symlink(nwb_file, symlink_path)

    os.environ["NWB_DIR"] = temp_dir
    os.environ["PORT"] = str(port)

    # Change to the directory containing package.json
    current_script_dir = os.path.dirname(os.path.realpath(__file__))
    desired_dir = os.path.join(current_script_dir, '../../experimental-local-file-access')
    absolute_desired_dir = os.path.abspath(desired_dir)
    os.chdir(absolute_desired_dir)

    #process = subprocess.Popen(["npm", "install"])

    # Start the server
    process = subprocess.Popen(["npm", "run", "start", os.environ["NWB_DIR"]])

    url = f"https://flatironinstitute.github.io/neurosift/?p=/nwb&url=http://localhost:{port}/files/{nwb_file_name}"
    print(f"Server started. Access your file at: {url}")

    webbrowser.open(url)


def start_server_cli():
    parser = argparse.ArgumentParser(description="Start a server for a .nwb file.")
    parser.add_argument("nwb_file", help="The .nwb file you want to serve.")
    parser.add_argument("--port", default=61762, type=int, help="Port number for the server (default is 61762).")
    args = parser.parse_args()

    start_server(args.nwb_file, args.port)

