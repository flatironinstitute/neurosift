from setuptools import setup, find_packages

setup(
    packages=find_packages(),
    scripts=[],
    include_package_data=True,
    package_data={},
    install_requires=[
        'click'
    ],
    entry_points={
        "console_scripts": [
            "neurosift=neurosift.cli:neurosift",
        ],
    }
)
