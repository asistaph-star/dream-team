import React from 'react';

export const MythicEnergyAura = () => (
    <div className="absolute top-[-50px] bottom-[30px] inset-x-0 z-[20] pointer-events-none">
        {/* Soft backlight glow so the vector flames pop */}
        <div className="absolute bottom-[0px] left-1/2 -translate-x-1/2 w-[80px] h-[50px] bg-[#ea580c] rounded-full blur-[15px] opacity-60" />
        
        {/* Razor sharp, smoothly animated vector flames */}
        <svg viewBox="0 0 100 150" className="absolute inset-0 w-full h-full opacity-90" preserveAspectRatio="none">
            <defs>
                <linearGradient id="fire-grad" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#ea580c"/>
                    <stop offset="40%" stopColor="#f97316"/>
                    <stop offset="70%" stopColor="#eab308"/>
                    <stop offset="100%" stopColor="transparent"/>
                </linearGradient>
            </defs>
            <path fill="url(#fire-grad)">
                <animate attributeName="d" dur="0.8s" repeatCount="indefinite"
                    values="
                        M 0 150 Q 15 80 25 120 Q 40 30 50 100 Q 60 30 75 120 Q 85 80 100 150 Z;
                        M 0 150 Q 10 90 20 130 Q 35 50 45 110 Q 55 20 70 110 Q 80 90 100 150 Z;
                        M 0 150 Q 20 70 30 110 Q 50 20 60 90 Q 75 40 85 130 Q 90 70 100 150 Z;
                        M 0 150 Q 15 80 25 120 Q 40 30 50 100 Q 60 30 75 120 Q 85 80 100 150 Z
                    "
                />
            </path>
            <path fill="#fef08a" opacity="0.8">
                <animate attributeName="d" dur="0.8s" repeatCount="indefinite"
                    values="
                        M 15 150 Q 25 100 35 130 Q 45 60 50 110 Q 55 60 65 130 Q 75 100 85 150 Z;
                        M 15 150 Q 20 110 30 140 Q 40 80 45 120 Q 50 50 60 120 Q 70 110 85 150 Z;
                        M 15 150 Q 30 90 40 120 Q 55 50 60 100 Q 70 70 80 140 Q 80 90 85 150 Z;
                        M 15 150 Q 25 100 35 130 Q 45 60 50 110 Q 55 60 65 130 Q 75 100 85 150 Z
                    "
                />
            </path>
        </svg>
    </div>
);
