import { motion } from 'framer-motion';
import { useMemo } from 'react';

const COLORS = [
  'hsl(174, 62%, 38%)',  // primary
  'hsl(12, 80%, 60%)',   // accent
  'hsl(45, 80%, 60%)',   // gold
  'hsl(280, 60%, 60%)',  // purple
  'hsl(150, 60%, 50%)',  // green
  'hsl(340, 70%, 60%)',  // pink
];

const SHAPES = ['circle', 'square', 'triangle'] as const;

interface Particle {
  id: number;
  x: number;
  color: string;
  shape: typeof SHAPES[number];
  size: number;
  delay: number;
  duration: number;
  rotation: number;
  drift: number;
}

export default function ConfettiEffect({ count = 40 }: { count?: number }) {
  const particles = useMemo<Particle[]>(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      size: 6 + Math.random() * 6,
      delay: Math.random() * 0.6,
      duration: 1.2 + Math.random() * 1,
      rotation: Math.random() * 720 - 360,
      drift: (Math.random() - 0.5) * 60,
    })), [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-50">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}%`, opacity: 1, rotate: 0, scale: 1 }}
          animate={{
            y: 350,
            x: `calc(${p.x}% + ${p.drift}px)`,
            opacity: [1, 1, 0],
            rotate: p.rotation,
            scale: [1, 1, 0.5],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeOut',
          }}
          style={{ position: 'absolute', width: p.size, height: p.size }}
        >
          {p.shape === 'circle' && (
            <div className="w-full h-full rounded-full" style={{ backgroundColor: p.color }} />
          )}
          {p.shape === 'square' && (
            <div className="w-full h-full rounded-sm" style={{ backgroundColor: p.color }} />
          )}
          {p.shape === 'triangle' && (
            <div
              className="w-0 h-0"
              style={{
                borderLeft: `${p.size / 2}px solid transparent`,
                borderRight: `${p.size / 2}px solid transparent`,
                borderBottom: `${p.size}px solid ${p.color}`,
              }}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}
