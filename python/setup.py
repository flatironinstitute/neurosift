from setuptools import setup, find_packages

setup(
    name="neurosift",
    version="0.1.0",
    packages=find_packages(),
    scripts=[],
    include_package_data=True,
    package_data={},
    install_requires=[
        'rtcshare>=0.1.5',
        'kachery_cloud',
        'zarr',
        'filelock'
    ],
    entry_points={
        'console_scripts': [
            'neurosift=neurosift.nwb_server:start_server_cli',
        ],
    },
)
