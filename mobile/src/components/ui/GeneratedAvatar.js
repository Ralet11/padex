import React, { useMemo } from 'react';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { normalizeAvatarSeed } from '../../utils/avatarSeed';

const PALETTES = [
  ['#0B1020', '#1E3A8A', '#7DD3FC', '#F8FAFC'],
  ['#0F172A', '#1D4ED8', '#38BDF8', '#E0F2FE'],
  ['#111827', '#7C3AED', '#F472B6', '#FCE7F3'],
  ['#101828', '#0F766E', '#5EEAD4', '#ECFEFF'],
  ['#1C1917', '#EA580C', '#FDBA74', '#FFF7ED'],
  ['#172554', '#4338CA', '#A78BFA', '#EEF2FF'],
  ['#1F2937', '#BE123C', '#FDA4AF', '#FFF1F2'],
  ['#082F49', '#0369A1', '#67E8F9', '#ECFEFF'],
];

function createWavePath(variant) {
  const curves = [
    'M 0 72 C 18 52, 35 92, 58 74 S 94 58, 100 40 L 100 100 L 0 100 Z',
    'M 0 60 C 20 44, 38 86, 62 70 S 88 40, 100 54 L 100 100 L 0 100 Z',
    'M 0 82 C 16 56, 34 58, 50 76 S 82 96, 100 62 L 100 100 L 0 100 Z',
  ];

  return curves[variant % curves.length];
}

export function GeneratedAvatar({ seed, name, size = 40, style }) {
  const normalizedSeed = useMemo(
    () => normalizeAvatarSeed(seed, name),
    [seed, name]
  );

  const palette = PALETTES[normalizedSeed.palette % PALETTES.length];
  const [base, gradientTo, accent, contrast] = palette;
  const rotation = (normalizedSeed.energy % 12) * 15;
  const mainCircleX = 26 + (normalizedSeed.orbit % 5) * 11;
  const mainCircleY = 18 + (normalizedSeed.composition % 4) * 10;
  const mainCircleRadius = 18 + (normalizedSeed.accent % 4) * 4;
  const orbitCircleX = 64 + (normalizedSeed.composition % 3) * 8;
  const orbitCircleY = 24 + (normalizedSeed.energy % 5) * 11;
  const orbitCircleRadius = 8 + (normalizedSeed.palette % 3) * 3;
  const lineOpacity = 0.14 + (normalizedSeed.energy % 4) * 0.04;
  const wavePath = createWavePath(normalizedSeed.composition);

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      <Defs>
        <LinearGradient id="avatarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={base} />
          <Stop offset="100%" stopColor={gradientTo} />
        </LinearGradient>
        <ClipPath id="avatarClip">
          <Circle cx="50" cy="50" r="50" />
        </ClipPath>
      </Defs>

      <G clipPath="url(#avatarClip)">
        <Rect width="100" height="100" fill="url(#avatarGradient)" />

        <Path d={wavePath} fill={contrast} opacity={0.12} />

        <Circle
          cx={mainCircleX}
          cy={mainCircleY}
          r={mainCircleRadius}
          fill={accent}
          opacity={0.72}
        />

        <Circle
          cx={orbitCircleX}
          cy={orbitCircleY}
          r={orbitCircleRadius}
          fill={contrast}
          opacity={0.26}
        />

        <G origin="50,50" rotation={rotation}>
          <Rect
            x="32"
            y="18"
            width="44"
            height="44"
            rx="16"
            fill={contrast}
            opacity={0.1 + (normalizedSeed.accent % 3) * 0.05}
          />
          <Rect
            x="18"
            y="52"
            width="52"
            height="22"
            rx="11"
            fill={accent}
            opacity={0.2}
          />
        </G>

        <Path
          d="M18 24 L44 18 L34 42 Z"
          fill={contrast}
          opacity={0.16 + (normalizedSeed.palette % 3) * 0.05}
        />

        <Path
          d="M62 66 C 70 52, 84 52, 88 70 C 80 84, 66 84, 62 66 Z"
          fill={accent}
          opacity={0.26}
        />

        <Rect x="0" y="0" width="100" height="100" fill="none" stroke="#FFFFFF" strokeOpacity="0.06" />

        <Path
          d="M14 14 H86 M14 86 H86 M14 14 V86 M86 14 V86"
          stroke={contrast}
          strokeOpacity={lineOpacity}
          strokeWidth="1.2"
        />
      </G>
    </Svg>
  );
}
