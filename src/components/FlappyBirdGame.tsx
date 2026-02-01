import { useRef, useEffect, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw, Trophy, Volume2, VolumeX, Music, Music2 } from "lucide-react";
import { gameAudio } from "@/lib/gameAudio";

interface Pipe {
  x: number;
  topHeight: number;
  passed: boolean;
}

interface FlappyBirdGameProps {
  faceY: number | null; // 0-1 normalized face Y position
  isTracking: boolean;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 500;
const BIRD_SIZE = 35;
const PIPE_WIDTH = 60;
const PIPE_GAP = 150;
const PIPE_SPEED = 3;
const PIPE_SPAWN_INTERVAL = 2000;

/**
 * Flappy Bird game controlled by face Y position
 * Bird moves up/down based on face position in camera
 */
export function FlappyBirdGame({ faceY, isTracking }: FlappyBirdGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const lastScoreRef = useRef(0);
  
  const gameRef = useRef({
    birdY: CANVAS_HEIGHT / 2,
    pipes: [] as Pipe[],
    score: 0,
    animationId: null as number | null,
    lastPipeSpawn: 0,
  });

  // Draw bird with animation
  const drawBird = useCallback((ctx: CanvasRenderingContext2D, y: number, frame: number) => {
    const x = 80;
    const wobble = Math.sin(frame * 0.2) * 3;
    
    // Wing flap animation
    const wingAngle = Math.sin(frame * 0.3) * 0.3;
    
    ctx.save();
    ctx.translate(x, y + wobble);
    
    // Body gradient
    const bodyGradient = ctx.createRadialGradient(0, 0, 5, 0, 0, BIRD_SIZE / 2);
    bodyGradient.addColorStop(0, "hsl(45, 100%, 60%)");
    bodyGradient.addColorStop(1, "hsl(35, 100%, 50%)");
    
    // Body
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, BIRD_SIZE / 2, BIRD_SIZE / 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Wing
    ctx.fillStyle = "hsl(35, 90%, 45%)";
    ctx.save();
    ctx.rotate(wingAngle);
    ctx.beginPath();
    ctx.ellipse(-5, 5, 12, 8, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Eye
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(10, -5, 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(12, -5, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye shine
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(13, -7, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Beak
    ctx.fillStyle = "hsl(15, 100%, 50%)";
    ctx.beginPath();
    ctx.moveTo(15, 2);
    ctx.lineTo(28, 5);
    ctx.lineTo(15, 10);
    ctx.closePath();
    ctx.fill();
    
    // Tail feathers
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

  // Draw pipe with gradient
  const drawPipe = useCallback((ctx: CanvasRenderingContext2D, pipe: Pipe) => {
    const gradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
    gradient.addColorStop(0, "hsl(142, 70%, 35%)");
    gradient.addColorStop(0.5, "hsl(142, 70%, 45%)");
    gradient.addColorStop(1, "hsl(142, 70%, 30%)");
    
    ctx.fillStyle = gradient;
    
    // Top pipe
    ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
    // Top pipe cap
    ctx.fillStyle = "hsl(142, 70%, 40%)";
    ctx.fillRect(pipe.x - 5, pipe.topHeight - 25, PIPE_WIDTH + 10, 25);
    
    // Bottom pipe
    const bottomY = pipe.topHeight + PIPE_GAP;
    ctx.fillStyle = gradient;
    ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, CANVAS_HEIGHT - bottomY);
    // Bottom pipe cap
    ctx.fillStyle = "hsl(142, 70%, 40%)";
    ctx.fillRect(pipe.x - 5, bottomY, PIPE_WIDTH + 10, 25);
    
    // Pipe highlights
    ctx.strokeStyle = "hsl(142, 60%, 55%)";
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

  // Draw background
  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, frame: number) => {
    // Sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    skyGradient.addColorStop(0, "hsl(200, 80%, 70%)");
    skyGradient.addColorStop(0.6, "hsl(200, 70%, 80%)");
    skyGradient.addColorStop(1, "hsl(40, 70%, 80%)");
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Clouds
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    const cloudOffset = (frame * 0.5) % (CANVAS_WIDTH + 100);
    
    // Cloud 1
    ctx.beginPath();
    ctx.arc(150 - cloudOffset / 3, 80, 30, 0, Math.PI * 2);
    ctx.arc(180 - cloudOffset / 3, 70, 35, 0, Math.PI * 2);
    ctx.arc(210 - cloudOffset / 3, 80, 30, 0, Math.PI * 2);
    ctx.fill();
    
    // Cloud 2
    ctx.beginPath();
    ctx.arc(350 - cloudOffset / 2, 120, 25, 0, Math.PI * 2);
    ctx.arc(375 - cloudOffset / 2, 110, 30, 0, Math.PI * 2);
    ctx.arc(400 - cloudOffset / 2, 120, 25, 0, Math.PI * 2);
    ctx.fill();
    
    // Ground
    ctx.fillStyle = "hsl(90, 50%, 40%)";
    ctx.fillRect(0, CANVAS_HEIGHT - 40, CANVAS_WIDTH, 40);
    
    // Ground detail
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

  // Check collision
  const checkCollision = useCallback((birdY: number, pipes: Pipe[]): boolean => {
    const birdX = 80;
    const birdRadius = BIRD_SIZE / 2 - 5;
    
    // Ground/ceiling collision
    if (birdY - birdRadius < 0 || birdY + birdRadius > CANVAS_HEIGHT - 40) {
      return true;
    }
    
    // Pipe collision
    for (const pipe of pipes) {
      if (birdX + birdRadius > pipe.x && birdX - birdRadius < pipe.x + PIPE_WIDTH) {
        if (birdY - birdRadius < pipe.topHeight || birdY + birdRadius > pipe.topHeight + PIPE_GAP) {
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
    
    const game = gameRef.current;
    
    // Update bird position based on face Y
    if (faceY !== null && isTracking) {
      // Map face Y (0-1) to canvas Y with faster response
      // Invert: face up (low Y) = bird up, face down (high Y) = bird down
      const targetY = faceY * (CANVAS_HEIGHT - 100) + 50;
      // Increased smoothing factor for more responsive control
      game.birdY += (targetY - game.birdY) * 0.25;
    }
    
    // Spawn pipes
    if (timestamp - game.lastPipeSpawn > PIPE_SPAWN_INTERVAL) {
      const minHeight = 50;
      const maxHeight = CANVAS_HEIGHT - PIPE_GAP - 90;
      const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
      
      game.pipes.push({
        x: CANVAS_WIDTH,
        topHeight,
        passed: false,
      });
      game.lastPipeSpawn = timestamp;
    }
    
    // Update pipes
    game.pipes = game.pipes.filter(pipe => {
      pipe.x -= PIPE_SPEED;
      
      // Score when passing pipe
      if (!pipe.passed && pipe.x + PIPE_WIDTH < 80) {
        pipe.passed = true;
        game.score++;
        setScore(game.score);
        
        // Play score sound
        if (game.score > lastScoreRef.current) {
          gameAudio.playScore();
          lastScoreRef.current = game.score;
        }
      }
      
      return pipe.x > -PIPE_WIDTH;
    });
    
    // Check collision
    if (checkCollision(game.birdY, game.pipes)) {
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
    drawBackground(ctx, frame);
    game.pipes.forEach(pipe => drawPipe(ctx, pipe));
    drawBird(ctx, game.birdY, frame);
    
    // Draw score
    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;
    ctx.font = "bold 36px 'JetBrains Mono'";
    ctx.textAlign = "center";
    ctx.strokeText(game.score.toString(), CANVAS_WIDTH / 2, 50);
    ctx.fillText(game.score.toString(), CANVAS_WIDTH / 2, 50);
    
    // Draw face Y indicator on the left side
    if (faceY !== null && isTracking) {
      const indicatorY = faceY * (CANVAS_HEIGHT - 100) + 50;
      
      // Indicator line
      ctx.strokeStyle = "rgba(0, 255, 255, 0.5)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, indicatorY);
      ctx.lineTo(60, indicatorY);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Indicator dot
      ctx.fillStyle = "hsl(187, 100%, 50%)";
      ctx.beginPath();
      ctx.arc(15, indicatorY, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // Small arrow pointing to bird
      ctx.fillStyle = "rgba(0, 255, 255, 0.7)";
      ctx.beginPath();
      ctx.moveTo(60, indicatorY);
      ctx.lineTo(50, indicatorY - 5);
      ctx.lineTo(50, indicatorY + 5);
      ctx.closePath();
      ctx.fill();
    }
    
    // Face tracking indicator
    if (!isTracking || faceY === null) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = "hsl(0, 70%, 60%)";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("👤 No face detected!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.font = "14px sans-serif";
      ctx.fillStyle = "white";
      ctx.fillText("Move your face into camera view", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
    }
    
    game.animationId = requestAnimationFrame(gameLoop);
  }, [faceY, isTracking, checkCollision, drawBackground, drawBird, drawPipe, highScore]);

  // Start game
  const startGame = useCallback(() => {
    const game = gameRef.current;
    game.birdY = CANVAS_HEIGHT / 2;
    game.pipes = [];
    game.score = 0;
    game.lastPipeSpawn = 0;
    lastScoreRef.current = 0;
    setScore(0);
    setGameState("playing");
    
    // Play start sound and music
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
      // Stop music when game stops
      gameAudio.stopMusic();
    };
  }, [gameState, gameLoop]);

  // Draw idle/gameover screen
  useEffect(() => {
    if (gameState !== "playing") {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      
      // Background
      drawBackground(ctx, 0);
      drawBird(ctx, CANVAS_HEIGHT / 2, 0);
      
      // Overlay
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      ctx.textAlign = "center";
      
      if (gameState === "gameover") {
        // Game over screen
        ctx.fillStyle = "hsl(0, 70%, 60%)";
        ctx.font = "bold 42px sans-serif";
        ctx.fillText("Game Over!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);
        
        ctx.fillStyle = "white";
        ctx.font = "bold 28px 'JetBrains Mono'";
        ctx.fillText(`Score: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        
        if (score === highScore && score > 0) {
          ctx.fillStyle = "hsl(45, 100%, 50%)";
          ctx.font = "bold 18px sans-serif";
          ctx.fillText("🏆 New High Score!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 35);
        }
      } else {
        // Idle screen
        ctx.fillStyle = "hsl(187, 100%, 50%)";
        ctx.font = "bold 32px sans-serif";
        ctx.fillText("Flappy Face", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
        
        ctx.fillStyle = "white";
        ctx.font = "16px sans-serif";
        ctx.fillText("Move your face UP/DOWN", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.fillText("to control the bird!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 25);
        
        if (highScore > 0) {
          ctx.fillStyle = "hsl(45, 100%, 50%)";
          ctx.font = "bold 14px 'JetBrains Mono'";
          ctx.fillText(`Best: ${highScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
        }
      }
    }
  }, [gameState, score, highScore, drawBackground, drawBird]);

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
