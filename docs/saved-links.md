# Saved Neurosift links

Researchers save Neurosift links to datasets, files, views and settings, and put
them in papers, notebooks and chat messages. Every link below keeps opening the
same thing in the redesign, apart from the few marked **Not supported**, which say
what opens instead. If a link form ever has to change, the old form is mapped to
the new one, not dropped.

This list was checked on November 10, 2026, against upstream
`flatironinstitute/neurosift` main at commit `c0e9b8c3` (October 23, 2026), and
against Neurosift v1's routes. Rows marked **Tested** are loaded against live
DANDI, EMBER and OpenNeuro data by the end-to-end suite in
`e2e/tests/old-links.spec.ts`, which runs on every pull request. Every v1 form is
also covered by the unit tests in `src/util/legacyUrl.test.ts`, which check the
exact address each one is rewritten to.

**Status** means:

- **Works as before**: the link opens exactly as it did upstream.
- **Redirected**: the app rewrites the address once when it starts, replacing the
  history entry, so Back doesn't return to the old form. `embedded=1` and the part
  after `#` are kept. The rewriting lives in `src/util/legacyUrl.ts`.
- **Not supported**: what opens instead, and why.

## Home and search

| Link | Example | Opens | Status | Tested |
| --- | --- | --- | --- | --- |
| `/` | https://neurosift.app/ | Home | Works as before | Yes |
| `/search` with `q`, `archive`, `mode`, `sort`, `types` | https://neurosift.app/search?q=mouse&archive=DANDI,EMBER | The catalog with that search | New in the redesign | No |
| Any unknown path | https://neurosift.app/no-such-page | Home | Works as before | Yes |
| `/experimental-neurotile` | https://neurosift.app/experimental-neurotile | Home | Works as before: upstream sent it on to `/experimental-neurosift-tiles`, a page that no longer exists, so it ended on Home there too | No |

## Archive pages

Upstream, `/dandi`, `/ember` and `/openneuro` read no search parameters: the
search box, mode and type picks were never in the address. The redesign shows the
catalog filtered to that archive, and adds `q`, `mode`, `sort` and `types`.

| Link | Example | Opens | Status | Tested |
| --- | --- | --- | --- | --- |
| `/dandi` | https://neurosift.app/dandi | The catalog, DANDI only | Works as before | Yes |
| `/ember` | https://neurosift.app/ember | The catalog, EMBER only | Works as before | Yes |
| `/openneuro` | https://neurosift.app/openneuro | The catalog, OpenNeuro only | Works as before | Yes |

## DANDI, EMBER and OpenNeuro datasets

`tab` names a file to open in the dataset's file list, as
`<file path>|<parent id>`; this is what upstream's share button copied.

| Link | Example | Opens | Status | Tested |
| --- | --- | --- | --- | --- |
| `/dandiset/:id` | https://neurosift.app/dandiset/000673 | The Dandiset, latest version | Works as before | No |
| `/dandiset/:id?dandisetVersion=` | https://neurosift.app/dandiset/000673?dandisetVersion=0.250122.0110 | The Dandiset at that version | Works as before | Yes |
| `/dandiset/:id?tab=` | https://neurosift.app/dandiset/000673?dandisetVersion=0.250122.0110&tab=sub-1/sub-1_ses-1_ecephys%2Bimage.nwb\| | The Dandiset with that file open | Works as before | Yes |
| `/ember-dandiset/:id` | https://neurosift.app/ember-dandiset/000207 | The EMBER Dandiset | Works as before | Yes |
| `/ember-dandiset/:id?tab=` | https://neurosift.app/ember-dandiset/000207?tab=sub-synthetic-pre-release-0-1/sub-synthetic-pre-release-0-1.nwb\| | The EMBER Dandiset with that file open | Works as before | Yes |
| `/openneuro-dataset/:id` | https://neurosift.app/openneuro-dataset/ds000001 | The OpenNeuro dataset | Works as before | No |
| `/openneuro-dataset/:id?tab=` | https://neurosift.app/openneuro-dataset/ds000001?tab=participants.tsv\| | The dataset with that file open | Works as before | Yes |

## NWB files with tabs and views

The file is given by `url`, or by `dandisetId` with `path` (the asset's path in
the Dandiset). `dandisetId` and `dandisetVersion` link the file back to its
Dandiset. `tab` takes one of the forms below. Each view also keeps its own
settings in the address, under the same names as upstream: PSTH and
Event-related signal after `#` (`units`, `alignTo`, `groupBy`, `windowStart`,
`ta_series`, `ta_win` and the rest), Icephys, Videos, Pose and Spectrogram in the
search parameters (`icephys…`, `videoLayout`, `videoOrder`, `videoTime`, `pose…`,
`spec`).

| Link | Example | Opens | Status | Tested |
| --- | --- | --- | --- | --- |
| `/nwb?url=&dandisetId=&dandisetVersion=` | https://neurosift.app/nwb?url=https://api.dandiarchive.org/api/assets/65a7e913-45c7-48db-bf19-b9f5e910110a/download/&dandisetId=000673&dandisetVersion=0.250122.0110 | The file, Widgets tab | Works as before | Yes (with a `tab`) |
| `/nwb?dandisetId=&path=` | https://neurosift.app/nwb?dandisetId=000673&dandisetVersion=0.250122.0110&path=sub-1/sub-1_ses-1_ecephys%2Bimage.nwb | The file, found by its path | Works as before. A `+` in the path has to be written `%2B`, as upstream: a bare `+` reads as a space and finds no file | Yes |
| `tab=` a section | …&tab=hdf5 (also `timeseries-alignment`, `python-usage`, `specifications`, `video-widget`, `icephys`) | That section | Works as before | Yes (`hdf5`) |
| `tab=` an object path | …&tab=/units | The object in its default view | Works as before | Yes |
| `tab=view:Plugin\|path` | …&tab=view:PSTH\|/intervals/trials | The object in that view | Works as before | Yes |
| `tab=view:Plugin\|path^secondary` | …&tab=view:TrialAlignedSeries\|/intervals/trials^/processing/ophys/Fluorescence/RoiResponseSeries | The view with a second object | Works as before | No |
| `tab=view:` a renamed plugin | …&tab=view:TimeAlignedSeries\|/intervals/trials | The Event-related signal view, its current name | Works as before | Yes |
| `tab=` a JSON list | …&tab=["/units","Raster\|/units"] | Several objects in one combined view | Works as before | Yes |
| A view's settings after `#` | …&tab=view:PSTH\|/intervals/trials#units=0,1 | The PSTH with units 0 and 1 picked | Works as before | Yes |
| `embedded=1` | …&embedded=1 | The page without the app bar | Works as before | Yes (from a v1 link) |
| `lindi=0` | …&lindi=0 | The file read directly, not through a LINDI index | Works as before | No |

## Settings

| Link | Example | Opens | Status | Tested |
| --- | --- | --- | --- | --- |
| `/settings` | https://neurosift.app/settings | Settings | Works as before: it reads nothing from the address, upstream or now | No |
| `/guide` | https://neurosift.app/guide | The NWB viewer guide | Works as before | No |

## Other viewers

The file addresses in these examples are placeholders; give the viewer a real file's URL.

| Link | Example | Opens | Status | Tested |
| --- | --- | --- | --- | --- |
| `/edf?url=&versionId=` | https://neurosift.app/edf?url=https://example.org/recording.edf | The EDF recording | Works as before | No |
| `/video?url=&dandisetId=&dandisetVersion=` | https://neurosift.app/video?url=https://example.org/video.mp4 | The video | Works as before | No |
| `/slp?url=` | https://neurosift.app/slp?url=https://example.org/poses.slp | The SLEAP file | Works as before | No |

## Neurosift v1 links

Neurosift v1 put the page in `?p=`. These links are redirected to the v2 page
with the same dataset, file and view. In `tab`, v1 named views differently: its
X/Y view is SpatialSeriesXY now and RasterPlot is Raster. A v1 view with no v2
counterpart opens its object in the object's default view.

| Link | Example | Opens | Status | Tested |
| --- | --- | --- | --- | --- |
| `?p=/` | https://neurosift.app/?p=/ | Home | Redirected to `/` | No |
| `?p=/dandi` | https://neurosift.app/?p=/dandi | The catalog, DANDI only | Redirected to `/dandi` | Yes |
| `?p=/dandiset&dandisetId=&dandisetVersion=` | https://neurosift.app/?p=/dandiset&dandisetId=000673&dandisetVersion=0.250122.0110 | The Dandiset at that version | Redirected to `/dandiset/000673?dandisetVersion=…` | Yes |
| `?p=/dandiset&staging=1` | https://neurosift.app/?p=/dandiset&dandisetId=000673&staging=1 | The DANDI Dandiset with that number | Not supported: v2 has no DANDI staging archive, so `staging` is dropped | No |
| `?p=/ember` | https://neurosift.app/?p=/ember | The catalog, EMBER only | Redirected to `/ember` | No |
| `?p=/ember-dandiset&emberDandisetId=` | https://neurosift.app/?p=/ember-dandiset&emberDandisetId=000207 | The EMBER Dandiset | Redirected to `/ember-dandiset/000207` | Yes |
| `?p=/openneuro` | https://neurosift.app/?p=/openneuro | The catalog, OpenNeuro only | Redirected to `/openneuro` (was Home before this change) | No |
| `?p=/openneuro-dataset&datasetId=&datasetVersion=` | https://neurosift.app/?p=/openneuro-dataset&datasetId=ds000001&datasetVersion=1.0.0 | The OpenNeuro dataset | Redirected to `/openneuro-dataset/ds000001` (was Home before this change). The page shows the latest snapshot, so `datasetVersion` is dropped | Yes |
| `?p=/nwb&url=&dandisetId=&dandisetVersion=` | https://neurosift.app/?p=/nwb&url=https://api.dandiarchive.org/api/assets/65a7e913-45c7-48db-bf19-b9f5e910110a/download/&dandisetId=000673&dandisetVersion=0.250122.0110 | The file | Redirected to `/nwb?…` | Yes |
| `?p=/nwb&dandiAssetId=` | https://neurosift.app/?p=/nwb&dandisetId=000673&dandiAssetId=65a7e913-45c7-48db-bf19-b9f5e910110a | The file, from its DANDI asset id | Redirected to `/nwb?url=<the asset's download URL>…` (was a page with no file before this change) | No |
| `tab=neurodata-item:path\|Type` | …&tab=neurodata-item:/units\|Units | The object | Redirected to `tab=/units` | Yes |
| `tab=view:X/Y\|path` | …&tab=view:X/Y\|/acquisition/EyeTracking/pupil_tracking | The X/Y view | Redirected to `tab=view:SpatialSeriesXY\|…` (opened a broken tab before this change) | Yes |
| `tab=view:RasterPlot\|path` | …&tab=view:RasterPlot\|/units | The raster | Redirected to `tab=view:Raster\|/units` (opened only the Widgets tab before this change) | No |
| `tab=view:PSTH\|path`, `tab=view:TrialAlignedSeries\|path^secondary` | …&tab=view:PSTH\|/intervals/trials | The same view | Redirected, tab unchanged (opened only the Widgets tab before this change) | Yes (PSTH) |
| `tab=view:` a v1-only view | …&tab=view:AverageWaveforms\|/units | The object in its default view | Not supported: AverageWaveforms, Autocorrelograms, UnitLocations, SpikeDensityPlot and the photon-series movie views aren't in v2, so the object opens instead | No |
| `tab=neurodata-items:a@b` | …&tab=neurodata-items:neurodata-item:/units\|Units@view:RasterPlot\|/units | The combined view | Redirected to a JSON list, `tab=["/units","Raster\|/units"]` | Yes |
| `tab=timeseries-alignment` | …&tab=timeseries-alignment | That section | Redirected, tab unchanged (dropped, opening the Widgets tab, before this change) | No |
| `tab=main` | …&tab=main | The Widgets tab | Redirected, `tab` dropped | No |
| `?p=/nwb&st=lindi` | https://neurosift.app/?p=/nwb&url=https://fsbucket-dendro.flatironinstitute.org/dendro-outputs/2d2b13fd/2d2b13fd.ec254350/output&dandisetId=000871&dandisetVersion=draft&st=lindi | The first `url` | Not verified: v2 finds a file's LINDI index itself and doesn't read `st`, so a LINDI file whose address has no `.lindi.json` ending may not open. Use the DANDI asset's own URL instead | No |
| `embedded=1` | https://neurosift.app/?p=/dandi&embedded=1 | The page without the app bar | Kept on the redirect | Yes (on a `?p=/nwb` link) |
| `?p=/edf&url=&versionId=` | https://neurosift.app/?p=/edf&url=https://example.org/recording.edf | The EDF recording | Redirected to `/edf?url=…` | No |
| `?p=/avi&url=` | https://neurosift.app/?p=/avi&url=https://example.org/video.avi | The video | Redirected to `/video?url=…` (was Home before this change) | No |
| `?p=/chat`, `/saved-chats`, `/about`, `/browse`, `/annotations`, `/dandi-query`, `/plugin`, `/compute`, `/import`, `/tests` and the login pages | https://neurosift.app/?p=/chat&chatId=abc | Home | Not supported: these v1 pages have no v2 counterpart. Neurosift Chat is its own app now | Yes (`/chat`) |
