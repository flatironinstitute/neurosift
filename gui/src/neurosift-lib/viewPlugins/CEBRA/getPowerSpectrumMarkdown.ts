const getPowerSpectrumMarkdown = (
  cebraOutputUrl: string,
  binSizeMsec: number,
) => {
  return `
# Plot power spectrum for this embedding

\`\`\`bash
pip install matplotlib lindi
\`\`\`

\`\`\`python
import numpy as np
import matplotlib.pyplot as plt
import skdim
import lindi

url = "${cebraOutputUrl}"
bin_size_msec = ${binSizeMsec}

f = lindi.LindiH5pyFile.from_lindi_file(url)
embedding = f['embedding'][()]

def power_spectrum(data, fs):
    n = data.shape[0]
    k = data.shape[1]
    f = np.fft.fftfreq(n, 1/fs)
    spectrum = np.zeros((n, k))
    for i in range(k):
        spectrum[:, i] = np.abs(np.fft.fft(data[:, i]))**2
    spectrum = spectrum.mean(axis=1)
    return f, spectrum

fs = 1000 / bin_size_msec
f, spectrum = power_spectrum(embedding, fs)
n = f.shape[0]
plt.figure(figsize=(10, 5))
plt.plot(f[:n//2], spectrum[:n//2], color='b')
plt.xscale('log')
plt.title('Power Spectrum of Embeddings')
plt.xlabel('Frequency (Hz)')
plt.ylabel('Power')
plt.grid(True)
plt.show()
\`\`\`
`;
};

export default getPowerSpectrumMarkdown;
