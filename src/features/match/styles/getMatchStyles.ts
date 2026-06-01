export const getMatchStyles = (matchScale: number): string => `
        .stadium {
            width: 1420px; height: 800px; min-width: 1420px; flex-shrink: 0;
            background-image: url('https://www.dreamteamph.com/bg/match_stadium-v2.webp');
            background-size: 100% 100%; position: relative;
            transform: scale(${matchScale}); transform-origin: center;
        }
        .player-unit { position: absolute; width: 106px; height: 110px; z-index: 10; transition: transform 0.3s; background: transparent; }
        .player-unit:hover { z-index: 100; }
        .headshot { width: 106px; height: 100px; background-size: cover; background-repeat: no-repeat; background-position: center; position: absolute; bottom: 26px; left: 0; z-index: 30; }
        .card-bottom-wrapper { width: 106px; height: 34px; position: absolute; bottom: 0; left: 0; box-sizing: border-box; background: rgba(15, 15, 20, 0.85); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); border-top: 1px solid rgba(255, 255, 255, 0.05); border-radius: 0 0 8px 8px; display: flex; flex-direction: column; overflow: hidden; z-index: 40; }
        .stamina-container { width: 100%; height: 4px; background: linear-gradient(to right, #ef4444, #f97316, #10b981); position: relative; overflow: hidden; }
        .stamina-mask { height: 100%; width: 0; background: #1f2937; position: absolute; top: 0; right: 0; transition: width 1s; }
        .card-info { width: 100%; height: 30px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3px 8px; cursor: default; text-align: center; }

        /* Hover Tooltip */
        .player-tooltip {
            display: none; position: absolute; bottom: 105%; left: 50%; transform: translateX(-50%);
            width: 240px; background: rgba(10,10,15,0.96); border: 2px solid #d87625;
            border-radius: 8px; padding: 0; z-index: 200; pointer-events: none;
            box-shadow: 0 8px 32px rgba(0,0,0,0.8);
        }
        .player-unit:hover .player-tooltip { display: block; }
        .tt-header { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: linear-gradient(to right, #d87625, #b45309); border-radius: 6px 6px 0 0; }
        .tt-name { color: white; font-weight: 900; font-size: 13px; }
        .tt-pos { color: white; font-weight: bold; font-size: 12px; background: rgba(0,0,0,0.3); padding: 1px 8px; border-radius: 4px; }
        .tt-body { padding: 8px 10px; }
        .tt-row { display: flex; justify-content: space-between; font-size: 11px; color: #d1d5db; padding: 2px 0; border-bottom: 1px solid #1f2937; }
        .tt-row:last-child { border-bottom: none; }
        .tt-row b { color: white; }
        .tt-stats { display: flex; justify-content: space-around; padding: 5px 10px; background: #0d1117; border-top: 1px solid #d87625; font-size: 10px; color: #9ca3af; }
        .tt-stats b { color: #eab308; font-size: 12px; }
        .tt-hot { text-align: center; font-size: 10px; color: #f59e0b; padding: 4px; background: rgba(245,158,11,0.1); font-weight: bold; }
        .tt-rarity { text-align: center; font-size: 10px; font-weight: 900; padding: 4px 0 6px; }

        .h-sf { top: 450px; left: 200px; }
        .h-c  { top: 290px; left: 160px; }
        .h-pf { top: 200px; left: 340px; }
        .h-sg { top: 430px; left: 420px; }
        .h-pg { top: 280px; left: 500px; }

        .a-sf { top: 450px; right: 180px; }
        .a-c  { top: 290px; right: 140px; }
        .a-pf { top: 200px; right: 320px; }
        .a-sg { top: 430px; right: 400px; }
        .a-pg { top: 280px; right: 480px; }

        @keyframes float-up {
            0% { transform: translateY(0); opacity: 1; }
            100% { transform: translateY(-40px); opacity: 0; }
        }
        @keyframes fadeIn {
            0% { opacity: 0; transform: scale(0.5); }
            100% { opacity: 1; transform: scale(1); }
        }
        @keyframes earthquake {
            0%,100% { transform: translate(0,0) rotate(0deg); }
            10%      { transform: translate(-5px,-3px) rotate(-0.6deg); }
            20%      { transform: translate(5px,3px) rotate(0.6deg); }
            30%      { transform: translate(-4px,4px) rotate(-0.4deg); }
            40%      { transform: translate(4px,-4px) rotate(0.4deg); }
            50%      { transform: translate(-6px,2px) rotate(-0.7deg); }
            60%      { transform: translate(6px,-2px) rotate(0.7deg); }
            70%      { transform: translate(-3px,5px) rotate(-0.3deg); }
            80%      { transform: translate(3px,-5px) rotate(0.3deg); }
            90%      { transform: translate(-5px,2px) rotate(-0.5deg); }
        }
        @keyframes earthquake-heavy {
            0%,100% { transform: translate(0,0) rotate(0deg); }
            8%       { transform: translate(-9px,-5px) rotate(-1.2deg); }
            16%      { transform: translate(9px,5px) rotate(1.2deg); }
            24%      { transform: translate(-7px,7px) rotate(-0.8deg); }
            32%      { transform: translate(7px,-7px) rotate(0.8deg); }
            40%      { transform: translate(-10px,3px) rotate(-1.5deg); }
            48%      { transform: translate(10px,-3px) rotate(1.5deg); }
            56%      { transform: translate(-6px,9px) rotate(-0.6deg); }
            64%      { transform: translate(6px,-9px) rotate(0.6deg); }
            72%      { transform: translate(-8px,4px) rotate(-1deg); }
            80%      { transform: translate(8px,-4px) rotate(1deg); }
            88%      { transform: translate(-9px,6px) rotate(-0.9deg); }
        }
        @keyframes lightning-bolt {
            0%,90%,100% { opacity:0; transform:scaleY(0.8); }
            10%,30%     { opacity:1; transform:scaleY(1); }
            20%         { opacity:0.3; }
            50%,70%     { opacity:1; transform:scaleY(1); }
            60%         { opacity:0.2; }
        }
        @keyframes run-glow-user {
            0%,100% { box-shadow: 0 0 30px rgba(6,182,212,0.7), 0 0 60px rgba(6,182,212,0.3); }
            50%     { box-shadow: 0 0 60px rgba(6,182,212,1), 0 0 120px rgba(6,182,212,0.6), inset 0 0 40px rgba(6,182,212,0.2); }
        }
        @keyframes run-glow-ai {
            0%,100% { box-shadow: 0 0 30px rgba(239,68,68,0.7), 0 0 60px rgba(239,68,68,0.3); }
            50%     { box-shadow: 0 0 60px rgba(239,68,68,1), 0 0 120px rgba(239,68,68,0.6), inset 0 0 40px rgba(239,68,68,0.2); }
        }
        @keyframes run-text-pop {
            0%   { transform: scale(0.4) rotate(-8deg); opacity:0; }
            40%  { transform: scale(1.15) rotate(2deg); opacity:1; }
            60%  { transform: scale(0.95) rotate(-1deg); }
            80%  { transform: scale(1.05) rotate(0.5deg); }
            100% { transform: scale(1) rotate(0deg); opacity:1; }
        }
        @keyframes lightning-flash-bg {
            0%,100%  { opacity:0; }
            5%,15%   { opacity:0.18; }
            10%      { opacity:0.05; }
            50%,60%  { opacity:0.18; }
            55%      { opacity:0.05; }
        }
        @keyframes banner-pop {
            0%   { transform: translateY(8px) scale(0.92); opacity: 0; }
            18%  { transform: translateY(0) scale(1.0); opacity: 1; }
            82%  { transform: translateY(0) scale(1.0); opacity: 1; }
            100% { transform: translateY(-6px) scale(0.95); opacity: 0; }
        }
        @keyframes particle-blow {
            0% { transform: translate(-50%, -50%) rotate(var(--rot)) translateY(0) scale(1); opacity: 1; }
            100% { transform: translate(-50%, -50%) rotate(var(--rot)) translateY(-65px) scale(0.2); opacity: 0; }
        }
        @keyframes splash-bounce {
            0% { transform: skewX(-12deg) scale(0.5); opacity: 0; }
            50% { transform: skewX(-12deg) scale(1.25); opacity: 1; }
            100% { transform: skewX(-12deg) scale(1.1); opacity: 1; }
        }
`;
