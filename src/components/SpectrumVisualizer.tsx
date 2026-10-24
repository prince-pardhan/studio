/**
 * BeatFlow Studio - Real-Time Audio Visualizer
 * Frequency spectrum analyzer (FFT) and live time-domain oscilloscope.
 */
import React, { useRef, useEffect, useState } from 'react';
import { Activity, Radio } from 'lucide-react';
import { AudioEngine } from '../audio/AudioEngine';

export const SpectrumVisualizer: React.FC = () => {
  const [visualMode, setVisualMode] = useState<'spectrum' | 'oscilloscope'>('spectrum');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioEngine = useRef(AudioEngine.getInstance()).current;

  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const masterAnalyser = (audioEngine.mixer as any).channels?.get(0)?.analyser as AnalyserNode;
    if (!masterAnalyser) return;

    masterAnalyser.fftSize = 256;
    const bufferLength = masterAnalyser.frequencyBinCount;
    const freqData = new Uint8Array(bufferLength);
    const timeData = new Uint8Array(bufferLength);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (visualMode === 'spectrum') {
        masterAnalyser.getByteFrequencyData(freqData);
        const barWidth = (canvas.width / 32) - 1.5;

        for (let i = 0; i < 32; i++) {
          const val = freqData[i * 2] / 255.0;
          const barHeight = val * (canvas.height - 4);
          const x = i * (barWidth + 1.5);
          const y = canvas.height - barHeight;

          // Color gradient from cyan to orange to red
          ctx.fillStyle =
            val > 0.85 ? '#ef4444' : val > 0.6 ? '#f97316' : '#06b6d4';
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      } else {
        masterAnalyser.getByteTimeDomainData(timeData);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#10b981';
        ctx.beginPath();

        const sliceWidth = canvas.width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = timeData[i] / 128.0;
          const y = (v * canvas.height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [visualMode, audioEngine]);

  return (
    <div className="flex items-center gap-2 px-2.5 py-1 bg-[#0c0d12] rounded-md border border-[#232535]">
      <canvas
        ref={canvasRef}
        width={110}
        height={24}
        className="w-28 h-6 rounded cursor-pointer"
        onClick={() =>
          setVisualMode(visualMode === 'spectrum' ? 'oscilloscope' : 'spectrum')
        }
        title="Click to toggle Spectrum / Oscilloscope"
      />
      <button
        onClick={() =>
          setVisualMode(visualMode === 'spectrum' ? 'oscilloscope' : 'spectrum')
        }
        className="text-[9px] font-mono uppercase text-zinc-400 hover:text-orange-400 font-bold"
      >
        {visualMode === 'spectrum' ? 'FFT' : 'SCOPE'}
      </button>
    </div>
  );
};
