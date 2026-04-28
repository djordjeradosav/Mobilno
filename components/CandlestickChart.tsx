import React from 'react';
import Svg, { Line, Rect } from 'react-native-svg';

export function CandlestickChart() {
    // Candle data: [x, open, close, high, low, isGreen]
    const candles = [
        [40, 120, 160, 100, 175, true],
        [80, 150, 130, 120, 165, false],
        [120, 130, 175, 115, 190, true],
        [160, 170, 145, 135, 180, false],
        [200, 145, 195, 130, 210, true],  // ← big green candle (hero)
        [240, 190, 165, 155, 200, false],
        [280, 168, 185, 150, 195, true],
    ];

    return (
        <Svg width="300" height="220" viewBox="0 0 320 220">
            {/* Horizontal grid lines */}
            {[40, 80, 120, 160, 200].map(y => (
                <Line
                    key={y} x1="0" y1={y} x2="320" y2={y}
                    stroke="rgba(0,0,0,0.08)" strokeWidth="1"
                    strokeDasharray="4,4"
                />
            ))}

            {/* Candles */}
            {candles.map(([x, open, close, high, low, green], i) => {
                const color = green ? '#111111' : 'rgba(0,0,0,0.3)';
                const bodyTop = Math.min(open as number, close as number);
                const bodyH = Math.abs((close as number) - (open as number));
                return (
                    <React.Fragment key={i}>
                        {/* Wick */}
                        <Line
                            x1={x as number} y1={high as number}
                            x2={x as number} y2={low as number}
                            stroke={color} strokeWidth="2"
                        />
                        {/* Body */}
                        <Rect
                            x={(x as number) - 8} y={bodyTop as number}
                            width="16" height={bodyH}
                            fill={color} rx="2"
                        />
                    </React.Fragment>
                );
            })}
        </Svg>
    );
}