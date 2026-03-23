export type Edge = 'bottom' | 'right' | 'top' | 'left';
export type EdgeDir = 'forward' | 'backward';
export type IdleBehaviorType = 'none' | 'dance' | 'impatient' | 'lookup' | 'stretch';
export type SonicMood = 'normal' | 'worried' | 'happy' | 'urgent';

export interface SonicCanvasProps {
  characterType?: 'sonic' | 'mimi' | 'genie' | 'robot';
  edgeDir?: EdgeDir;
  isWalking?: boolean;
  isGreeting?: boolean;
  isBoosting?: boolean;
  isJumping?: boolean;
  isDragging?: boolean;
  currentEdge?: Edge;
  momentum?: { x: number; y: number };
  idleBehavior?: IdleBehaviorType;
  returningFromIdle?: boolean;
  sonicMoodState?: SonicMood;
  mouseDirection?: 'left' | 'right' | null;
  mood?: 'excited' | 'alert' | 'talk' | 'idle';
  isPausedForSonic?: boolean;
  sonicMood?: 'idle' | 'talk' | 'excited' | 'alert';
}
