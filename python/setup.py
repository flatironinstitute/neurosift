from setuptools import setup, find_packages

with open('README.md', 'r', encoding='utf-8') as f:
    long_description = f.read()

setup(
    packages=find_packages(),
    scripts=[],
    include_package_data=True,
    package_data={},
    install_requires=[
        'click'
    ],
    long_description=long_description,
    long_description_content_type='text/markdown',  # This is important!
    entry_points={
        "console_scripts": [
            "neurosift=neurosift.cli:neurosift",
        ],
    }
)
