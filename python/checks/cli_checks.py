"""Checks for the neurosift command line interface.

Run with: pytest python/checks/cli_checks.py
(The directory is not named "tests" because python/.gitignore ignores every
path starting with "test".)
"""

import os

from click.testing import CliRunner

from neurosift.cli import neurosift


def test_view_nwb_rejects_a_directory(tmp_path):
    store = tmp_path / "file.nwb.zarr"
    store.mkdir()
    (store / ".zmetadata").write_text("{}")
    runner = CliRunner()
    result = runner.invoke(neurosift, ["view-nwb", str(store)])
    assert result.exit_code != 0
    assert "not supported" in result.output
    assert "Zarr" in result.output


def test_view_nwb_rejects_a_missing_file(tmp_path):
    runner = CliRunner()
    result = runner.invoke(neurosift, ["view-nwb", str(tmp_path / "nope.nwb")])
    assert result.exit_code != 0
    assert "does not exist" in result.output


def test_help_lists_view_nwb():
    runner = CliRunner()
    result = runner.invoke(neurosift, ["--help"])
    assert result.exit_code == 0
    assert "view-nwb" in result.output
    assert os.path.basename(__file__) == "cli_checks.py"
