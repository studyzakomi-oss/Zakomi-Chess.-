import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { Chess, kingSquare, type Color, type PieceSymbol, type Square } from '../../core/chess/game';
import { fenPieces, turnOf } from '../../core/chess/fen';
import { hangingPieces } from '../../core/chess/attacks';
import { PieceSvg } from './Pieces';

export interface Arrow {
  from: Square;
  to: Square;
  color?: string;
}

export interface BoardProps {
  fen: string;
  orientation?: Color;
  /** Which side the user may move (null = view only). */
  movable?: Color | null;
  onMove?: (from: Square, to: Square, promotion?: PieceSymbol) => void;
  lastMove?: [Square, Square] | null;
  arrows?: Arrow[];
  highlights?: Square[];
  /** Square-selection mode (for "select the squares" questions). */
  selectable?: boolean;
  selected?: Square[];
  onSquareClick?: (sq: Square) => void;
  /** Squares to mark as correct / missed after answering. */
  marksGood?: Square[];
  marksBad?: Square[];
  showLegal?: boolean;
  showThreats?: boolean;
  label?: string;
}

const FILES = 'abcdefgh';

function squareAt(file: number, rank: number): Square {
  return (FILES[file] + (rank + 1)) as Square;
}

function coords(sq: Square, orientation: Color) {
  const f = sq.charCodeAt(0) - 97;
  const r = Number(sq[1]) - 1;
  return orientation === 'w' ? { x: f, y: 7 - r } : { x: 7 - f, y: r };
}

export function Board({
  fen,
  orientation = 'w',
  movable = null,
  onMove,
  lastMove,
  arrows = [],
  highlights = [],
  selectable,
  selected = [],
  onSquareClick,
  marksGood = [],
  marksBad = [],
  showLegal = true,
  showThreats = false,
  label,
}: BoardProps) {
  const pieces = useMemo(() => {
    try {
      return fenPieces(fen);
    } catch {
      return [];
    }
  }, [fen]);
  const chess = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return null;
    }
  }, [fen]);
  const [sel, setSel] = useState<Square | null>(null);
  const [drag, setDrag] = useState<{ from: Square; x: number; y: number } | null>(null);
  const [promo, setPromo] = useState<{ from: Square; to: Square } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ sq: Square; x: number; y: number; moved: boolean } | null>(null);

  useEffect(() => {
    setSel(null);
    setPromo(null);
  }, [fen]);

  const canMove = !!(movable && chess && turnOf(fen) === movable && !chess.isGameOver());
  const legalFrom = (sq: Square) =>
    canMove ? chess!.moves({ square: sq, verbose: true }) : [];
  const targets = useMemo(() => (sel ? legalFrom(sel) : []), [sel, fen, canMove]); // eslint-disable-line react-hooks/exhaustive-deps
  const checkSq = chess && chess.inCheck() ? kingSquare(chess, chess.turn()) : null;
  const threats = useMemo(
    () => (showThreats && chess && movable ? hangingPieces(chess, movable).map((h) => h.square) : []),
    [showThreats, chess, movable],
  );

  function squareFromPoint(clientX: number, clientY: number): Square | null {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return null;
    const x = Math.floor(((clientX - r.left) / r.width) * 8);
    const y = Math.floor(((clientY - r.top) / r.height) * 8);
    if (x < 0 || x > 7 || y < 0 || y > 7) return null;
    return orientation === 'w' ? squareAt(x, 7 - y) : squareAt(7 - x, y);
  }

  function attempt(from: Square, to: Square) {
    const ms = legalFrom(from).filter((m) => m.to === to);
    if (!ms.length) return false;
    if (ms.some((m) => m.promotion)) setPromo({ from, to });
    else onMove?.(from, to);
    setSel(null);
    return true;
  }

  function onDown(e: RPointerEvent) {
    if (promo) return;
    const sq = squareFromPoint(e.clientX, e.clientY);
    if (!sq) return;
    if (selectable) {
      onSquareClick?.(sq);
      return;
    }
    if (!canMove) return;
    if (sel && sel !== sq && attempt(sel, sq)) return;
    const p = chess!.get(sq);
    if (p && p.color === movable) {
      setSel(sq);
      dragStart.current = { sq, x: e.clientX, y: e.clientY, moved: false };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } else setSel(null);
  }

  function onMovePtr(e: RPointerEvent) {
    const d = dragStart.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return;
    d.moved = true;
    const r = ref.current!.getBoundingClientRect();
    setDrag({ from: d.sq, x: ((e.clientX - r.left) / r.width) * 8, y: ((e.clientY - r.top) / r.height) * 8 });
  }

  function onUp(e: RPointerEvent) {
    const d = dragStart.current;
    dragStart.current = null;
    setDrag(null);
    if (!d || !d.moved) return;
    const to = squareFromPoint(e.clientX, e.clientY);
    if (to && to !== d.sq) attempt(d.sq, to);
  }

  const squares = [];
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      const sq = orientation === 'w' ? squareAt(x, 7 - y) : squareAt(7 - x, y);
      const dark = (x + y) % 2 === 1;
      const cls = ['sq', dark ? 'dark' : 'light'];
      if (lastMove && (lastMove[0] === sq || lastMove[1] === sq)) cls.push('last');
      if (sel === sq) cls.push('sel');
      if (highlights.includes(sq)) cls.push('hl');
      if (selected.includes(sq)) cls.push('picked');
      if (marksGood.includes(sq)) cls.push('good');
      if (marksBad.includes(sq)) cls.push('bad');
      if (checkSq === sq) cls.push('check');
      if (threats.includes(sq)) cls.push('threat');
      const t = targets.find((m) => m.to === sq);
      squares.push(
        <div key={sq} className={cls.join(' ')} data-square={sq}>
          {y === 7 && <span className="coord file">{sq[0]}</span>}
          {x === 0 && <span className="coord rank">{sq[1]}</span>}
          {t && showLegal && <span className={t.captured ? 'dot cap' : 'dot'} />}
        </div>,
      );
    }

  return (
    <div className="board-wrap" dir="ltr">
      <div
        ref={ref}
        className={`board${selectable ? ' selecting' : ''}`}
        onPointerDown={onDown}
        onPointerMove={onMovePtr}
        onPointerUp={onUp}
        onPointerCancel={() => {
          dragStart.current = null;
          setDrag(null);
        }}
        role="grid"
        aria-label={label ?? 'chess board'}
      >
        {squares}
        {pieces.map((p) => {
          const { x, y } = coords(p.square, orientation);
          const dragging = drag?.from === p.square;
          const style = dragging
            ? { transform: `translate(${(drag!.x - 0.5) * 100}%, ${(drag!.y - 0.5) * 100}%)`, zIndex: 5, transition: 'none' }
            : { transform: `translate(${x * 100}%, ${y * 100}%)` };
          return (
            <div key={p.square + p.type + p.color} className={`piece${dragging ? ' dragging' : ''}`} style={style} data-piece={`${p.color}${p.type}`} data-on={p.square}>
              <PieceSvg type={p.type} color={p.color} />
            </div>
          );
        })}
        {arrows.length > 0 && (
          <svg className="arrows" viewBox="0 0 8 8" aria-hidden="true">
            <defs>
              {arrows.map((a, i) => (
                <marker key={i} id={`ah${i}`} markerWidth="3" markerHeight="3" refX="1.6" refY="1.5" orient="auto">
                  <path d="M0,0 L3,1.5 L0,3 z" fill={a.color ?? 'var(--arrow)'} />
                </marker>
              ))}
            </defs>
            {arrows.map((a, i) => {
              const f = coords(a.from, orientation);
              const t = coords(a.to, orientation);
              const dx = t.x - f.x;
              const dy = t.y - f.y;
              const len = Math.hypot(dx, dy) || 1;
              return (
                <line
                  key={i}
                  x1={f.x + 0.5}
                  y1={f.y + 0.5}
                  x2={t.x + 0.5 - (dx / len) * 0.35}
                  y2={t.y + 0.5 - (dy / len) * 0.35}
                  stroke={a.color ?? 'var(--arrow)'}
                  strokeWidth={0.16}
                  strokeLinecap="round"
                  opacity={0.85}
                  markerEnd={`url(#ah${i})`}
                />
              );
            })}
          </svg>
        )}
        {promo && (
          <div className="promo" onPointerDown={(e) => e.stopPropagation()}>
            {(['q', 'r', 'b', 'n'] as PieceSymbol[]).map((p) => (
              <button
                key={p}
                className="promo-btn"
                aria-label={`promote ${p}`}
                data-promo={p}
                onClick={() => {
                  onMove?.(promo.from, promo.to, p);
                  setPromo(null);
                }}
              >
                <PieceSvg type={p} color={movable ?? 'w'} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
