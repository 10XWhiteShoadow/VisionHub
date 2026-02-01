import { useRef, useEffect, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw, Trophy, Volume2, VolumeX, Music, Music2, Zap } from "lucide-react";
import { gameAudio } from "@/lib/gameAudio";

interface Pipe {
  x: number;
  topHeight: number;
  passed: boolean;
}

interface LevelUpAnimation {
  active: boolean;
  startTime: number;
  level: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface FlappyBirdGameProps {
  faceY: number | null;
  isTracking: boolean;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 500;
const BIRD_SIZE = 35;
const PIPE_WIDTH = 60;

// Difficulty settings per level
const LEVELS = [
  { name: "Easy", pipeGap: 180, pipeSpeed: 2, spawnInterval: 2500, color: "hsl(142, 70%, 50%)", emoji: "🌱" },
  { name: "Medium", pipeGap: 160, pipeSpeed: 2.5, spawnInterval: 2200, color: "hsl(45, 100%, 50%)", emoji: "⚡" },
  { name: "Hard", pipeGap: 140, pipeSpeed: 3, spawnInterval: 1900, color: "hsl(25, 100%, 50%)", emoji: "🔥" },
  { name: "Expert", pipeGap: 125, pipeSpeed: 3.5, spawnInterval: 1700, color: "hsl(0, 80%, 55%)", emoji: "💀" },
  { name: "Insane", pipeGap: 110, pipeSpeed: 4, spawnInterval: 1500, color: "hsl(280, 80%, 55%)", emoji: "🚀" },
  { name: "GODLIKE", pipeGap: 100, pipeSpeed: 4.5, spawnInterval: 1300, color: "hsl(330, 100%, 50%)", emoji: "👑" },
];

// Score thresholds for level up
const LEVEL_THRESHOLDS = [0, 5, 12, 20, 30, 45];

export function FlappyBirdGame({ faceY, isTracking }: FlappyBirdGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const lastScoreRef = useRef(0);
  
  const gameRef = useRef({
    birdY: CANVAS_HEIGHT / 2,
    pipes: [] as Pipe[],
    score: 0,
    level: 0,
    animationId: null as number | null,
    lastPipeSpawn: 0,
    levelUpAnimation: { active: false, startTime: 0, level: 0 } as LevelUpAnimation,
    particles: [] as Particle[],
  });

  // Store previous faceY for interpolation
  const prevFaceYRef = useRef<number | null>(null);
  const lastGameLoopTimeRef = useRef<number>(0);

  // Get current level based on score
  const getLevelForScore = useCallback((score: number): number => {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (score >= LEVEL_THRESHOLDS[i]) return i;
    }
    return 0;
  }, []);

  // Create explosion particles for level up
  const createLevelUpParticles = useCallback((level: number) => {
    const particles: Particle[] = [];
    const colors = [
      LEVELS[level].color,
      "hsl(45, 100%, 60%)",
      "hsl(187, 100%, 50%)",
      "hsl(330, 100%, 60%)",
      "white"
    ];
    
    for (let i = 0; i < 50; i++) {
      const angle = (Math.PI * 2 * i) / 50 + Math.random() * 0.5;
      const speed = 3 + Math.random() * 5;
      particles.push({
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 5,
      });
    }
    return particles;
  }, []);

  // Draw bird with animation
  const drawBird = useCallback((ctx: CanvasRenderingContext2D, y: number, frame: number) => {
    const x = 80;
    const wobble = Math.sin(frame * 0.2) * 3;
    const wingAngle = Math.sin(frame * 0.3) * 0.3;
    
    ctx.save();
    ctx.translate(x, y + wobble);
    
    const bodyGradient = ctx.createRadialGradient(0, 0, 5, 0, 0, BIRD_SIZE / 2);
    bodyGradient.addColorStop(0, "hsl(45, 100%, 60%)");
    bodyGradient.addColorStop(1, "hsl(35, 100%, 50%)");
    
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, BIRD_SIZE / 2, BIRD_SIZE / 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "hsl(35, 90%, 45%)";
    ctx.save();
    ctx.rotate(wingAngle);
    ctx.beginPath();
    ctx.ellipse(-5, 5, 12, 8, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(10, -5, 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(12, -5, 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(13, -7, 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "hsl(15, 100%, 50%)";
    ctx.beginPath();
    ctx.moveTo(15, 2);
    ctx.lineTo(28, 5);
    ctx.lineTo(15, 10);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = "hsl(35, 80%, 40%)";
    ctx.beginPath();
    ctx.moveTo(-BIRD_SIZE / 2, -5);
    ctx.lineTo(-BIRD_SIZE / 2 - 12, -8);
    ctx.lineTo(-BIRD_SIZE / 2 - 10, 0);
    ctx.lineTo(-BIRD_SIZE / 2 - 14, 8);
    ctx.lineTo(-BIRD_SIZE / 2, 5);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  }, []);

  // Draw pipe with gradient based on level
  const drawPipe = useCallback((ctx: CanvasRenderingContext2D, pipe: Pipe, level: number, pipeGap: number) => {
    const levelColor = LEVELS[level].color;
    const hue = parseInt(levelColor.match(/hsl\((\d+)/)?.[1] || "142");
    
    const gradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
    gradient.addColorStop(0, `hsl(${hue}, 70%, 35%)`);
    gradient.addColorStop(0.5, `hsl(${hue}, 70%, 45%)`);
    gradient.addColorStop(1, `hsl(${hue}, 70%, 30%)`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
    
    ctx.fillStyle = `hsl(${hue}, 70%, 40%)`;
    ctx.fillRect(pipe.x - 5, pipe.topHeight - 25, PIPE_WIDTH + 10, 25);
    
    const bottomY = pipe.topHeight + pipeGap;
    ctx.fillStyle = gradient;
    ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, CANVAS_HEIGHT - bottomY);
    
    ctx.fillStyle = `hsl(${hue}, 70%, 40%)`;
    ctx.fillRect(pipe.x - 5, bottomY, PIPE_WIDTH + 10, 25);
    
    ctx.strokeStyle = `hsl(${hue}, 60%, 55%)`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pipe.x + 8, 0);
    ctx.lineTo(pipe.x + 8, pipe.topHeight - 25);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pipe.x + 8, bottomY + 25);
    ctx.lineTo(pipe.x + 8, CANVAS_HEIGHT);
    ctx.stroke();
  }, []);

  // Draw background with level-based tint
  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, frame: number, level: number) => {
    const levelHue = parseInt(LEVELS[level].color.match(/hsl\((\d+)/)?.[1] || "200");
    const skyHue = 200 + (levelHue - 200) * 0.1;
    
    const skyGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    skyGradient.addColorStop(0, `hsl(${skyHue}, 80%, 70%)`);
    skyGradient.addColorStop(0.6, `hsl(${skyHue}, 70%, 80%)`);
    skyGradient.addColorStop(1, "hsl(40, 70%, 80%)");
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    const cloudOffset = (frame * 0.5) % (CANVAS_WIDTH + 100);
    
    ctx.beginPath();
    ctx.arc(150 - cloudOffset / 3, 80, 30, 0, Math.PI * 2);
    ctx.arc(180 - cloudOffset / 3, 70, 35, 0, Math.PI * 2);
    ctx.arc(210 - cloudOffset / 3, 80, 30, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(350 - cloudOffset / 2, 120, 25, 0, Math.PI * 2);
    ctx.arc(375 - cloudOffset / 2, 110, 30, 0, Math.PI * 2);
    ctx.arc(400 - cloudOffset / 2, 120, 25, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "hsl(90, 50%, 40%)";
    ctx.fillRect(0, CANVAS_HEIGHT - 40, CANVAS_WIDTH, 40);
    
    ctx.fillStyle = "hsl(90, 40%, 30%)";
    for (let i = 0; i < CANVAS_WIDTH; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, CANVAS_HEIGHT - 40);
      ctx.lineTo(i + 10, CANVAS_HEIGHT - 40);
      ctx.lineTo(i + 5, CANVAS_HEIGHT - 48);
      ctx.closePath();
      ctx.fill();
    }
  }, []);

  // Draw level up animation
  const drawLevelUpAnimation = useCallback((ctx: CanvasRenderingContext2D, animation: LevelUpAnimation, timestamp: number, particles: Particle[]) => {
    const elapsed = timestamp - animation.startTime;
    const duration = 2000;
    const progress = Math.min(elapsed / duration, 1);
    
    if (progress >= 1) return false;
    
    // Update and draw particles
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1; // gravity
      p.life -= 0.02;
      
      if (p.life > 0) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
    
    // Animated text
    const level = LEVELS[animation.level];
    const scale = 1 + Math.sin(progress * Math.PI) * 0.3;
    const alpha = progress < 0.8 ? 1 : 1 - (progress - 0.8) / 0.2;
    
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);
    ctx.scale(scale, scale);
    
    // Glow effect
    ctx.shadowColor = level.color;
    ctx.shadowBlur = 30 + Math.sin(elapsed * 0.01) * 10;
    
    // Background flash
    if (progress < 0.3) {
      ctx.globalAlpha = (1 - progress / 0.3) * 0.4;
      ctx.fillStyle = level.color;
      ctx.fillRect(-CANVAS_WIDTH, -CANVAS_HEIGHT, CANVAS_WIDTH * 2, CANVAS_HEIGHT * 2);
      ctx.globalAlpha = alpha;
    }
    
    // "LEVEL UP!" text
    ctx.textAlign = "center";
    ctx.font = "bold 32px 'Space Grotesk', sans-serif";
    ctx.fillStyle = "white";
    ctx.strokeStyle = level.color;
    ctx.lineWidth = 4;
    ctx.strokeText("LEVEL UP!", 0, -20);
    ctx.fillText("LEVEL UP!", 0, -20);
    
    // Level name with emoji
    ctx.font = "bold 42px 'Space Grotesk', sans-serif";
    ctx.fillStyle = level.color;
    ctx.strokeStyle = "white";
    ctx.lineWidth = 3;
    ctx.strokeText(`${level.emoji} ${level.name}`, 0, 30);
    ctx.fillText(`${level.emoji} ${level.name}`, 0, 30);
    
    ctx.shadowBlur = 0;
    ctx.restore();
    
    return true;
  }, []);

  // Check collision
  const checkCollision = useCallback((birdY: number, pipes: Pipe[], pipeGap: number): boolean => {
    const birdX = 80;
    const birdRadius = BIRD_SIZE / 2 - 5;
    
    if (birdY - birdRadius < 0 || birdY + birdRadius > CANVAS_HEIGHT - 40) {
      return true;
    }
    
    for (const pipe of pipes) {
      if (birdX + birdRadius > pipe.x && birdX - birdRadius < pipe.x + PIPE_WIDTH) {
        if (birdY - birdRadius < pipe.topHeight || birdY + birdRadius > pipe.topHeight + pipeGap) {
          return true;
        }
      }
    }
    
    return false;
  }, []);

  // Game loop
  const gameLoop = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    
    const deltaTime = timestamp - lastGameLoopTimeRef.current;
    if (deltaTime < 16) {
      gameRef.current.animationId = requestAnimationFrame(gameLoop);
      return;
    }
    lastGameLoopTimeRef.current = timestamp;
    
    const game = gameRef.current;
    const level = LEVELS[game.level];
    
    // Check for level up
    const newLevel = getLevelForScore(game.score);
    if (newLevel > game.level) {
      game.level = newLevel;
      setCurrentLevel(newLevel);
      game.levelUpAnimation = {
        active: true,
        startTime: timestamp,
        level: newLevel,
      };
      game.particles = createLevelUpParticles(newLevel);
      gameAudio.playScore(); // Play sound for level up
    }
    
    // Update bird position
    if (faceY !== null && isTracking) {
      const currentFaceY = prevFaceYRef.current !== null 
        ? prevFaceYRef.current + (faceY - prevFaceYRef.current) * 0.5
        : faceY;
      prevFaceYRef.current = faceY;
      
      const targetY = currentFaceY * (CANVAS_HEIGHT - 100) + 50;
      game.birdY += (targetY - game.birdY) * 0.3;
    }
    
    // Spawn pipes with level-based interval
    if (timestamp - game.lastPipeSpawn > level.spawnInterval) {
      const minHeight = 50;
      const maxHeight = CANVAS_HEIGHT - level.pipeGap - 90;
      const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
      
      game.pipes.push({
        x: CANVAS_WIDTH,
        topHeight,
        passed: false,
      });
      game.lastPipeSpawn = timestamp;
    }
    
    // Update pipes with level-based speed
    game.pipes = game.pipes.filter(pipe => {
      pipe.x -= level.pipeSpeed;
      
      if (!pipe.passed && pipe.x + PIPE_WIDTH < 80) {
        pipe.passed = true;
        game.score++;
        setScore(game.score);
        
        if (game.score > lastScoreRef.current) {
          gameAudio.playScore();
          lastScoreRef.current = game.score;
        }
      }
      
      return pipe.x > -PIPE_WIDTH;
    });
    
    // Check collision with level-based gap
    if (checkCollision(game.birdY, game.pipes, level.pipeGap)) {
      gameAudio.playGameOver();
      gameAudio.stopMusic();
      setGameState("gameover");
      if (game.score > highScore) {
        setHighScore(game.score);
      }
      return;
    }
    
    // Draw
    const frame = timestamp / 16;
    drawBackground(ctx, frame, game.level);
    game.pipes.forEach(pipe => drawPipe(ctx, pipe, game.level, level.pipeGap));
    drawBird(ctx, game.birdY, frame);
    
    // Draw level indicator
    ctx.fillStyle = level.color;
    ctx.font = "bold 14px 'JetBrains Mono'";
    ctx.textAlign = "left";
    ctx.fillText(`${level.emoji} ${level.name}`, 10, 25);
    
    // Draw score
    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;
    ctx.font = "bold 36px 'JetBrains Mono'";
    ctx.textAlign = "center";
    ctx.strokeText(game.score.toString(), CANVAS_WIDTH / 2, 50);
    ctx.fillText(game.score.toString(), CANVAS_WIDTH / 2, 50);
    
    // Draw next level threshold
    const nextThreshold = LEVEL_THRESHOLDS[game.level + 1];
    if (nextThreshold !== undefined) {
      ctx.font = "12px 'JetBrains Mono'";
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillText(`Next: ${nextThreshold}`, CANVAS_WIDTH / 2, 70);
    }
    
    // Draw face Y indicator
    if (faceY !== null && isTracking) {
      const indicatorY = faceY * (CANVAS_HEIGHT - 100) + 50;
      
      ctx.strokeStyle = "rgba(0, 255, 255, 0.5)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, indicatorY);
      ctx.lineTo(60, indicatorY);
      ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.fillStyle = "hsl(187, 100%, 50%)";
      ctx.beginPath();
      ctx.arc(15, indicatorY, 8, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = "rgba(0, 255, 255, 0.7)";
      ctx.beginPath();
      ctx.moveTo(60, indicatorY);
      ctx.lineTo(50, indicatorY - 5);
      ctx.lineTo(50, indicatorY + 5);
      ctx.closePath();
      ctx.fill();
    }
    
    // No face warning
    if (!isTracking || faceY === null) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = "hsl(0, 70%, 60%)";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("👤 No face detected!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.font = "14px sans-serif";
      ctx.fillStyle = "white";
      ctx.fillText("Move your face into camera view", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
    }
    
    // Draw level up animation on top
    if (game.levelUpAnimation.active) {
      const stillActive = drawLevelUpAnimation(ctx, game.levelUpAnimation, timestamp, game.particles);
      if (!stillActive) {
        game.levelUpAnimation.active = false;
        game.particles = [];
      }
    }
    
    game.animationId = requestAnimationFrame(gameLoop);
  }, [faceY, isTracking, checkCollision, drawBackground, drawBird, drawPipe, drawLevelUpAnimation, getLevelForScore, createLevelUpParticles, highScore]);

  // Start game
  const startGame = useCallback(() => {
    const game = gameRef.current;
    game.birdY = CANVAS_HEIGHT / 2;
    game.pipes = [];
    game.score = 0;
    game.level = 0;
    game.lastPipeSpawn = 0;
    game.levelUpAnimation = { active: false, startTime: 0, level: 0 };
    game.particles = [];
    lastScoreRef.current = 0;
    prevFaceYRef.current = null;
    setScore(0);
    setCurrentLevel(0);
    setGameState("playing");
    
    gameAudio.playStart();
    if (musicEnabled) {
      setTimeout(() => gameAudio.startMusic(), 500);
    }
  }, [musicEnabled]);

  // Game state management
  useEffect(() => {
    if (gameState === "playing") {
      gameRef.current.animationId = requestAnimationFrame(gameLoop);
    }
    
    return () => {
      if (gameRef.current.animationId) {
        cancelAnimationFrame(gameRef.current.animationId);
      }
      gameAudio.stopMusic();
    };
  }, [gameState, gameLoop]);

  // Draw idle/gameover screen
  useEffect(() => {
    if (gameState !== "playing") {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      
      drawBackground(ctx, 0, 0);
      drawBird(ctx, CANVAS_HEIGHT / 2, 0);
      
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      ctx.textAlign = "center";
      
      if (gameState === "gameover") {
        const reachedLevel = LEVELS[currentLevel];
        
        ctx.fillStyle = "hsl(0, 70%, 60%)";
        ctx.font = "bold 42px sans-serif";
        ctx.fillText("Game Over!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80);
        
        ctx.fillStyle = "white";
        ctx.font = "bold 28px 'JetBrains Mono'";
        ctx.fillText(`Score: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
        
        ctx.fillStyle = reachedLevel.color;
        ctx.font = "bold 20px sans-serif";
        ctx.fillText(`${reachedLevel.emoji} Level: ${reachedLevel.name}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
        
        if (score === highScore && score > 0) {
          ctx.fillStyle = "hsl(45, 100%, 50%)";
          ctx.font = "bold 18px sans-serif";
          ctx.fillText("🏆 New High Score!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 55);
        }
      } else {
        ctx.fillStyle = "hsl(187, 100%, 50%)";
        ctx.font = "bold 32px sans-serif";
        ctx.fillText("Flappy Face", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);
        
        ctx.fillStyle = "white";
        ctx.font = "16px sans-serif";
        ctx.fillText("Move your face UP/DOWN", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
        ctx.fillText("to control the bird!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 5);
        
        ctx.fillStyle = LEVELS[0].color;
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(`${LEVELS[0].emoji} Starts at ${LEVELS[0].name}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
        
        if (highScore > 0) {
          ctx.fillStyle = "hsl(45, 100%, 50%)";
          ctx.font = "bold 14px 'JetBrains Mono'";
          ctx.fillText(`Best: ${highScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 70);
        }
      }
    }
  }, [gameState, score, highScore, currentLevel, drawBackground, drawBird]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Audio controls */}
      <div className="flex items-center gap-2">
        <Button
          variant={musicEnabled ? "neon-green" : "outline"}
          size="sm"
          onClick={() => {
            const enabled = gameAudio.toggleMusic();
            setMusicEnabled(enabled);
          }}
          className="gap-1.5"
        >
          {musicEnabled ? <Music className="w-4 h-4" /> : <Music2 className="w-4 h-4" />}
          Music
        </Button>
        <Button
          variant={sfxEnabled ? "neon-green" : "outline"}
          size="sm"
          onClick={() => {
            const enabled = gameAudio.toggleSfx();
            setSfxEnabled(enabled);
          }}
          className="gap-1.5"
        >
          {sfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          SFX
        </Button>
      </div>
      
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="rounded-xl border-2 border-primary/30 shadow-lg shadow-primary/20"
      />
      
      <div className="flex items-center gap-4">
        {gameState === "playing" ? (
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Score</p>
              <p className="text-2xl font-bold text-primary">{score}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Zap className="w-3 h-3" /> Level
              </p>
              <p className="text-lg font-bold" style={{ color: LEVELS[currentLevel].color }}>
                {LEVELS[currentLevel].emoji} {LEVELS[currentLevel].name}
              </p>
            </div>
            {highScore > 0 && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> Best
                </p>
                <p className="text-2xl font-bold text-accent-foreground">{highScore}</p>
              </div>
            )}
          </div>
        ) : (
          <Button onClick={startGame} variant="gradient" size="lg" className="gap-2">
            {gameState === "gameover" ? (
              <>
                <RotateCcw className="w-5 h-5" /> Play Again
              </>
            ) : (
              <>
                <Play className="w-5 h-5" /> Start Game
              </>
            )}
          </Button>
        )}
      </div>
      
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        {isTracking && faceY !== null 
          ? "🟢 Face detected! Move up/down to control the bird."
          : "🔴 Position your face in the camera to play."}
      </p>
    </div>
  );
}
