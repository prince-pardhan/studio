/**
 * BeatFlow Studio - PCM WAV Audio Encoder
 * Encodes AudioBuffer into 16-bit PCM, 24-bit PCM, or 32-bit Float Stereo RIFF WAV file Blob
 * with optional TPDF (Triangular Probability Density Function) dithering.
 */

export interface WavEncodingOptions {
  bitDepth?: 16 | 24 | 32;
  dither?: 'none' | 'tpdf';
  float32?: boolean;
}

export function audioBufferToWav(
  buffer: AudioBuffer,
  opt?: WavEncodingOptions
): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = opt?.bitDepth || (opt?.float32 ? 32 : 16);
  const format = bitDepth === 32 ? 3 : 1; // 3 = IEEE Float, 1 = PCM

  let result: Float32Array;
  if (numChannels === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }

  return encodeWAV(result, format, sampleRate, numChannels, bitDepth, opt?.dither || 'none');
}

function interleave(inputL: Float32Array, inputR: Float32Array): Float32Array {
  const length = inputL.length + inputR.length;
  const result = new Float32Array(length);

  let index = 0;
  let inputIndex = 0;

  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

function encodeWAV(
  samples: Float32Array,
  format: number,
  sampleRate: number,
  numChannels: number,
  bitDepth: number,
  dither: 'none' | 'tpdf'
): Blob {
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* RIFF chunk length */
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * blockAlign, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * bytesPerSample, true);

  if (bitDepth === 16) {
    floatTo16BitPCM(view, 44, samples, dither === 'tpdf');
  } else if (bitDepth === 24) {
    floatTo24BitPCM(view, 44, samples, dither === 'tpdf');
  } else {
    writeFloat32(view, 44, samples);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeFloat32(output: DataView, offset: number, input: Float32Array): void {
  for (let i = 0; i < input.length; i++, offset += 4) {
    output.setFloat32(offset, input[i], true);
  }
}

function floatTo16BitPCM(
  output: DataView,
  offset: number,
  input: Float32Array,
  useDither: boolean
): void {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = input[i];
    if (useDither) {
      // TPDF: Triangular Probability Density Function
      const r1 = Math.random() - 0.5;
      const r2 = Math.random() - 0.5;
      s += (r1 + r2) / 32768;
    }
    const clamped = Math.max(-1, Math.min(1, s));
    output.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }
}

function floatTo24BitPCM(
  output: DataView,
  offset: number,
  input: Float32Array,
  useDither: boolean
): void {
  for (let i = 0; i < input.length; i++, offset += 3) {
    let s = input[i];
    if (useDither) {
      const r1 = Math.random() - 0.5;
      const r2 = Math.random() - 0.5;
      s += (r1 + r2) / 8388608;
    }
    const clamped = Math.max(-1, Math.min(1, s));
    const val = clamped < 0 ? Math.floor(clamped * 0x800000) : Math.floor(clamped * 0x7fffff);
    output.setUint8(offset, val & 0xff);
    output.setUint8(offset + 1, (val >> 8) & 0xff);
    output.setUint8(offset + 2, (val >> 16) & 0xff);
  }
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
