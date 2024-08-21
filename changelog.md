# Changelog

All notable changes to this project will be documented in this file.

## 2024-08-21

* Rename pairio -> dendro

## 2024-08-20

* Spike sorting: Update compression ration choices to include 'lossless'

## 2024-08-19

* Add unit locations view

## 2024-08-14

* Use HEAD request to DANDI bucket rather than aborted GET

## 2024-08-09

* Use .lindi.tar instead of .lindi
* Add post-processing step for spike sorting
* Improve appearance of electrode geometry view
* Develop spike sorting view for ephys data

## 2024-08-07

* Use .lindi instead of .lindi.json
* QFC decompression for lindi files

## 2024-08-02

* Support lindi tar!

## 2024-07-30

* Fix TabWidget bug, incorrect number of tabs
* Format rate/duration in timeseries plots

## 2024-07-29

* View timeseries alignment: tooltip and color
* Longer duration spike sorting
* Display rate and duration in timeseries plots

## 2024-07-26

* Fix units summary ac view
* List recently viewed Dandisets

## 2024-07-25

* Added changelog.md
* Improve "share this tab" feature - can "Set URL to address bar"
* For Dendro Summary of ElectricalSeries, detect if sampling rate is >= 10 kHz and if so. If not, do not show the ephys summary
* Add link to changelog.md in info page
* Remove unnecessary headings in DEFAULT tab, e.g. specifications, general, stimulus (if not used), units (if not used)
* Change "DEFAULT" tab name to "NWB"
* WIP spike sorting
* Support RGBImage https://neurosift.app/?p=/nwb&url=https://api.dandiarchive.org/api/assets/acd6a646-f8c7-405e-9815-78fd6b6e442d/download/&dandisetId=000673&dandisetVersion=0.240524.1758&tab=neurodata-item:/stimulus/templates/StimulusTemplates|Images
* Not using cookies notice
* WIP report amount of data downloaded


## 2024-07-24

* Moved source code to this repository (was in [fi-sci monorepo](https://github.com/magland/fi-sci))
* Updated dev docs to reflect change in source code location
* Fix bug where timeseries was not showing because conversion = NaN
* Fix local NWB file server to correctly handle range requests! Who knows how it could have been working before the bug fix ??
* Fix image orientation for Image Neurodata objects
* Timeseries: color by channel and change color of x axis line
* Improve visibility sensing: use useInView()
* Improve plotly lazy loading behavior
* Uniform code formatting throughout the project

## 2024-07-22

* Refactor Pairio (dendro) view item for better UI flow
* Fix Pairio (dendro) component: Add jobFilter to useAllJobs so that only jobs relevant to the object path are shown
* Fix display problem with tab widgets
* Add Vercel analytics

## 2024-07-20

* Improve AVI page layout (use left panel)

## 2024-07-18

* Show y axis label in timeseries plots
* Disable pairio (dendro) views when viewing local files

## 2024-07-12

* Implement AVI video view using Pairio/Dendro
* Improve brightness/contrast controls for images

