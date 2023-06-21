Moved DrawingWidget to spikesortingview/src/FigurlCanvas

Created funcToTransform.ts and pointed to that in DrawingHelloWorld.tsx

Switching to using FigurlCanvas in src/views/Autocorrelograms/BarPlot

After trying to use CanvasFrame here, I think I'd prefer to just use a div (the way you originally did it)
because it is more natural to pass the layers in as child elements rather than in the canvases prop.

Switched to using BaseCanvas in BarPlotMainLayer.tsx -- seems to work very well

Switching to using FigurlCanvas in src/views/RasterPlot/TimeScrollView

Moved WaveformWidget.tsx and Waveform.tsx to src/views/AverageWaveforms/WaveformWidget

Moved sharedDrawingComponents to WaveformWidget/sharedDrawingComponents

Removed transform member of PixelSpaceElectrode (was not used anyway)

Removed RecordingSelection and RecordingSelectionDispatch because this will be handled differently

Update imports to use FigurlCanvas

Move over waveformLogic.ts

Change waveforms to waveform to be consistent (a single waveform can span multiple electrodes)

Changed Waveform.tsx to WaveformPlot.tsx (to avoid name conflicts between data and components)

CanvasFrame as it is now gives a warning that each (canvas) child should have a unique key prop. This is another reason to not use CanvasFrame. Just use div.

Switch from CanvasFrame to div in the various components.