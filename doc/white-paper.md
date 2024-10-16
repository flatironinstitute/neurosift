**Title: Developing Neurosift and Dendro: Unlocking the Potential of the DANDI Archive for Open Science**

**Introduction**

This white paper describes how supporting the development of two software technologies, Neurosift and Dendro, can significantly advance open science in the neurophysiology and neuroscience communities. Neurosift is a browser-based tool that allows interactive exploration of neurophysiology data, while Dendro provides a collaborative environment for streamlining the analysis of shared data in the cloud or using institutional resources. Both tools are tightly integrated with the DANDI Archive and were developed at the Flatiron Institute by Jeremy Magland, in collaboration with Ben Dichter, founder of CatalystNeuro, and members of the CatalystNeuro team. The DANDI Archive aims to be a comprehensive resource for open neurophysiology data, promoting collaboration, reproducibility, and discovery. However, it has immense unrealized potential because researchers currently lack incentives to upload their data. Neurosift and Dendro are tightly integrated with the DANDI Archive to help achieve these objectives by making data sharing beneficial for researchers—not just a compliance obligation, but a way to enhance their own research.

**Background**

Data sharing and streamlining analysis pipelines are crucial components of effective open science. Sharing data enables researchers to build upon each other's work, reducing redundancy and allowing for new discoveries that would not be possible with isolated datasets. It also enhances transparency and reproducibility, which are essential for validating scientific findings. Streamlining analysis pipelines further ensures that researchers can easily replicate results, reducing the time and effort required to reproduce complex analyses, thereby accelerating the pace of scientific discovery.

Funding agencies have recognized the importance of data sharing for advancing science and have prioritized initiatives that promote open and reproducible research. In fact, the NIH now mandates data sharing as part of its funding requirements. However, the rate and quality of compliance with these mandates remain inconsistent, largely due to the fragmented nature of data storage and the lack of direct incentives for researchers.

The DANDI Archive aims to be part of the solution by evolving into more than just a repository; it strives to be an ecosystem for collaborative science. It currently hosts over 300 public datasets (Dandisets) and more than 100 private (embargoed) Dandisets, totaling over 800 TB of data, mostly standardized in the Neurodata Without Borders (NWB) format. CatalystNeuro has greatly contributed to this effort by developing tools like NeuroConv and NWB Guide, which simplify the process of converting data to the NWB format and uploading it to the archive. However, without proper infrastructure for visualizing and processing these data, and incentives for researchers to engage with them, the archive risks becoming an underutilized collection of files.

Neurosift and Dendro have the ultimate goal of unlocking the full potential of DANDI for the neuroscience community by making data accessible, usable, and impactful for researchers. This white paper will first describe the existing state of the technology, highlighting current capabilities and limitations. It will then provide a vision for the future of Neurosift and Dendro, outlining proposed enhancements and their anticipated impact. Finally, the necessary resources and support required to achieve these objectives will be detailed.

**Current Functionality of Neurosift and Dendro**

NWB files on DANDI often contain a rich array of electrophysiology, behavioral, stimulus events, and other experimental data, but their large sizes—sometimes hundreds of gigabytes—make it impractical for users to download them just to examine the contents and metadata. While it is possible to stream metadata using Python scripts through the pynwb package, this approach is inconvenient and impractical, as users should not be required to write code merely to explore what data an NWB file contains. This is where Neurosift comes in—offering a rich, interactive web interface that allows users to explore data from the archive easily, with just a few clicks, by lazy-loading and presenting an interactive view of both metadata and data objects.

NWB files are organized hierarchically, encapsulating various "neurodata types" that represent different facets of neurophysiological experiments. These types range from BehavioralEvents, which capture discrete actions or occurrences during experiments, to data structures like Fluorescence, ImageSegmentation, and RoiResponseSeries, which are crucial for optical neurophysiology. Other neurodata types include ElectricalSeries for electrophysiological signals and Units for neuronal spike times. Neurosift enables users to interactively navigate this hierarchical structure (Figure 1) and provides plugin visualizations for many of these data types (Figure 2). Additionally, it facilitates the creation of composite views by allowing users to select and synchronize multiple data types within the same interface (Figure 3). This synchronization extends to navigation actions such as zooming and panning, ensuring that different sub-windows, each displaying a unique aspect of the data, share a unified time axis. These customized views can be easily shared with others via a URL.

![image](https://github.com/user-attachments/assets/dfd0ad23-1f29-4039-bc6c-66b209bd54a5)

![image](https://github.com/user-attachments/assets/3851dce2-acbf-4bce-b200-dc3b6087d2c1)

![image](https://github.com/user-attachments/assets/0afae3e6-ed7c-44b1-9c98-42a7b8350ae4)


Most of the interactive visualizations provided by Neurosift are processed entirely on the client side, meaning that data are streamed directly from cloud storage (AWS S3) and rendered within the web browser. However, purely client-side processing has its limitations. More complex operations, such as downsampling large extracellular electrophysiology datasets or computing autocorrelograms from extensive spike train data, require backend processing. Dendro addresses this need by providing backend capabilities that integrate seamlessly with the user experience. For instance, when a user wants to view autocorrelograms, they can simply click a button within the Neurosift interface, which queues a Dendro job to perform the computation (Figure 4). Once complete, subsequent visitors to the same dataset can then immediately view the processed results without needing to resubmit the request.

![image](https://github.com/user-attachments/assets/3318d24c-77f2-4980-9a13-a79925778cf1)


A second objective of Dendro is to streamline processing pipelines beyond visualization, with spike sorting of electrophysiology data being a prime example. Spike sorting involves detecting and classifying neuron signals, which requires careful attention to multiple factors. Installing spike sorting software is often complex, with challenging dependencies, and selecting the right parameters can be subjective, varying by dataset. Differences in data formatting across labs further complicate standardization, and the significant computational demands make spike sorting a difficult task for many labs. Dendro aims to address these challenges by providing an accessible, standardized, streamlined solution. Right now we are still at the early stage of developing this functionality.

**Proposed Future Enhancements**

**Resources Required**

**Conclusion**
