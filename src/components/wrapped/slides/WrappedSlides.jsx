import {useCallback, useRef} from 'react'
import {Share2, RotateCcw} from 'lucide-react'
import {toPng} from 'html-to-image'
import {toast} from 'sonner'
import {T, Var} from 'gt-react'
import PlayerAvatar from '../../shared/PlayerAvatar'

// ─── Base styles ──────────────────────────────────────────────────────────────
// Dark base (bg-neutral) with theme-color gradient overlays = works in both themes.
const slideBase =
    'relative flex min-h-[520px] sm:min-h-[560px] flex-col items-center justify-center rounded-3xl px-8 pt-10 pb-6 text-center overflow-hidden text-white'

// Subtle dot-grid texture overlay
function Pattern() {
    return (
        <div
            className="pointer-events-none absolute inset-0"
            style={{
                backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
                backgroundSize: '22px 22px',
            }}
        />
    )
}

// White glow blob — creates soft depth on any solid color background
function Glow({size = 'h-72 w-72', position = '-top-20'}) {
    return (
        <div
            className={`pointer-events-none absolute ${position} left-1/2 -translate-x-1/2 ${size} rounded-full bg-white/20 blur-3xl`}
        />
    )
}

// ─── Animations ───────────────────────────────────────────────────────────────
export const animStyles = `
@keyframes fadeUp   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
@keyframes scaleIn  { from{opacity:0;transform:scale(0.88)}      to{opacity:1;transform:scale(1)} }
@keyframes bounceIn { 0%{opacity:0;transform:scale(0.3)} 55%{opacity:1;transform:scale(1.07)} 75%{transform:scale(0.93)} 100%{transform:scale(1)} }
@keyframes numberPop{ 0%{opacity:0;transform:scale(0.4) translateY(10px)} 60%{opacity:1;transform:scale(1.1) translateY(-3px)} 100%{transform:scale(1) translateY(0)} }
@keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
@keyframes confettiFall{ 0%{transform:translateY(-10px) rotate(0deg);opacity:1} 85%{opacity:.9} 100%{transform:translateY(320px) rotate(560deg);opacity:0} }
@keyframes flamePop { 0%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(-90px) scale(0.4);opacity:0} }
@keyframes slideInRight{ from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
@keyframes slideInLeft { from{opacity:0;transform:translateX(-40px)} to{opacity:1;transform:translateX(0)} }
@keyframes widthGrow{ from{width:0} to{width:var(--target-width,100%)} }
@keyframes barGrow  { from{transform:scaleY(0);transform-origin:bottom} to{transform:scaleY(1);transform-origin:bottom} }
@keyframes waveMove{ 0%{transform:translateX(0)} 50%{transform:translateX(-25%)} 100%{transform:translateX(0)} }
@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
@keyframes pulseGlow{ 0%,100%{opacity:.35;transform:scale(1)} 50%{opacity:.55;transform:scale(1.08)} }
@keyframes drift    { 0%,100%{transform:translate(0,0)} 25%{transform:translate(8px,-6px)} 50%{transform:translate(-4px,4px)} 75%{transform:translate(6px,2px)} }
.afu  { animation:fadeUp 0.5s ease-out both }
.asi  { animation:scaleIn 0.4s ease-out both }
.abi  { animation:bounceIn 0.65s cubic-bezier(0.175,0.885,0.32,1.275) both }
.anp  { animation:numberPop 0.65s cubic-bezier(0.175,0.885,0.32,1.275) both }
.afl  { animation:float 3.5s ease-in-out 0.8s infinite }
.ad1  { animation-delay:0.08s }
.ad2  { animation-delay:0.18s }
.ad3  { animation-delay:0.28s }
.ad4  { animation-delay:0.38s }
.ad5  { animation-delay:0.48s }
.ad6  { animation-delay:0.58s }
.slide-enter-right { animation:slideInRight 0.32s ease-out both }
.slide-enter-left  { animation:slideInLeft  0.32s ease-out both }
`

// ─── Confetti & Fire ──────────────────────────────────────────────────────────
const CONFETTI = [
    {ch: '🎊', x: 5, d: 0}, {ch: '⭐', x: 14, d: 0.1},
    {ch: '✨', x: 23, d: 0.2}, {ch: '🎉', x: 33, d: 0.05},
    {ch: '🌟', x: 43, d: 0.15}, {ch: '🎊', x: 52, d: 0.25},
    {ch: '⭐', x: 61, d: 0.3}, {ch: '✨', x: 70, d: 0.1},
    {ch: '🎉', x: 80, d: 0.22}, {ch: '🌟', x: 90, d: 0.35},
    {ch: '🎊', x: 9, d: 0.42}, {ch: '⭐', x: 28, d: 0.48},
    {ch: '✨', x: 48, d: 0.52}, {ch: '🎉', x: 68, d: 0.4},
    {ch: '🌟', x: 88, d: 0.55},
]

function Confetti() {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {CONFETTI.map((c, i) => (
                <span key={i} className="absolute top-0 text-lg select-none"
                      style={{left: `${c.x}%`, animation: `confettiFall 2s ease-in ${c.d}s forwards`}}>
          {c.ch}
        </span>
            ))}
        </div>
    )
}

const FIRES = [
    {x: 10, d: 0}, {x: 25, d: 0.35}, {x: 42, d: 0.12},
    {x: 58, d: 0.48}, {x: 72, d: 0.22}, {x: 88, d: 0.58},
    {x: 18, d: 0.7}, {x: 50, d: 0.8}, {x: 80, d: 0.65},
]

function FireParticles() {
    return (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 overflow-hidden h-24">
            {FIRES.map((f, i) => (
                <span key={i} className="absolute bottom-0 text-2xl select-none"
                      style={{left: `${f.x}%`, animation: `flamePop 1.4s ease-out ${f.d}s infinite`}}>
          🔥
        </span>
            ))}
        </div>
    )
}

// ─── Animated background ornaments ────────────────────────────────────────────
function WaveBg() {
    return (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 overflow-hidden opacity-[0.12]">
            <svg className="w-[200%] h-full" style={{animation: 'waveMove 6s ease-in-out infinite'}}
                 viewBox="0 0 1440 120" preserveAspectRatio="none">
                <path d="M0,60 C240,120 480,0 720,60 C960,120 1200,0 1440,60 L1440,120 L0,120 Z" fill="white"/>
                <path d="M0,80 C240,20 480,100 720,80 C960,20 1200,100 1440,80 L1440,120 L0,120 Z" fill="white"
                      opacity="0.5" style={{animation: 'waveMove 8s ease-in-out 0.5s infinite'}}/>
            </svg>
        </div>
    )
}

function Shimmer() {
    return (
        <div className="pointer-events-none absolute inset-0"
             style={{
                 background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%)',
                 backgroundSize: '200% 100%',
                 animation: 'shimmer 4s ease-in-out infinite',
             }}
        />
    )
}

function DriftOrbs() {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute h-20 w-20 rounded-full bg-white/10 blur-2xl"
                 style={{top: '15%', left: '10%', animation: 'drift 7s ease-in-out infinite'}}/>
            <div className="absolute h-14 w-14 rounded-full bg-white/8 blur-xl"
                 style={{bottom: '20%', right: '12%', animation: 'drift 9s ease-in-out 1s infinite'}}/>
            <div className="absolute h-10 w-10 rounded-full bg-white/6 blur-lg"
                 style={{top: '50%', left: '70%', animation: 'drift 6s ease-in-out 0.5s infinite'}}/>
        </div>
    )
}

// ─── Share button (bottom of card, excluded from screenshot) ──────────────────
function ShareBtn({cardRef, text}) {
    const handleShare = useCallback(async (e) => {
        e.stopPropagation()
        if (cardRef?.current) {
            try {
                const dataUrl = await toPng(cardRef.current, {pixelRatio: 2.5, quality: 0.95})
                const blob = await (await fetch(dataUrl)).blob()
                const file = new File([blob], 'pool-wrapped.png', {type: 'image/png'})
                if (navigator.share && navigator.canShare?.({files: [file]})) {
                    await navigator.share({files: [file], title: 'World Cup 2026 Pool Wrapped'})
                    return
                }
                const a = document.createElement('a')
                a.href = dataUrl
                a.download = 'pool-wrapped.png'
                a.click()
                toast.success('Image downloaded!')
                return
            } catch {
                // image generation or share failed — fall through to text-only share
            }
        }
        if (navigator.share) {
            navigator.share({title: 'World Cup 2026 Pool Wrapped', text}).catch(() => {
            })
        } else {
            navigator.clipboard.writeText(text).then(() => toast.success('Copied!')).catch(() => {
            })
        }
    }, [cardRef, text])

    return (
        <button
            type="button"
            onClick={handleShare}
            data-html-to-image-ignore="true"
            aria-label="Share this card"
            className="mt-5 flex cursor-pointer items-center gap-2 rounded-full border border-white/25 bg-white/15 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-white/25 hover:scale-105 active:scale-95 backdrop-blur-sm"
        >
            <Share2 size={14}/>
            <T>Share</T>
        </button>
    )
}

// ─── Reusable stat card ────────────────────────────────────────────────────────
function StatCard({value, label, emoji}) {
    return (
        <div
            className="flex flex-col items-center rounded-2xl bg-black/15 border border-white/15 px-3 py-3 backdrop-blur-sm">
            {emoji && <div className="text-xl mb-1">{emoji}</div>}
            <div className="anp text-xl font-black text-white">{value}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/55 mt-0.5"><Var>{label}</Var></div>
        </div>
    )
}

// ─── Category label pill ──────────────────────────────────────────────────────
function Label({children}) {
    return (
        <div
            className="afu rounded-full bg-black/20 px-4 py-1 text-xs font-black uppercase tracking-[0.25em] text-white/80 backdrop-blur-sm">
            {children}
        </div>
    )
}

// ─── Slides ───────────────────────────────────────────────────────────────────

export function SlideCover({poolName}) {
    const cardRef = useRef(null)
    const shareText = `⚽ "${poolName}" World Cup 2026 Pool Wrapped is here!`
    return (
        <div ref={cardRef} className={slideBase}
             style={{background: 'linear-gradient(135deg, color-mix(in oklch, var(--color-primary) 38%, transparent), transparent 55%), var(--color-neutral)'}}>
            <Pattern/>
            <Glow size="h-80 w-80" position="-top-24"/>
            <div className="relative flex flex-col items-center">
                <div className="abi afl mb-5 flex items-center justify-center">
                    <img src="https://r2.thesportsdb.com/images/media/league/badge/e7er5g1696521789.png" alt="World Cup"
                         className="h-20 w-20 object-contain drop-shadow-lg"/>
                </div>
                <p className="afu text-white/70 text-xs font-black uppercase tracking-[0.3em]"><T>World Cup 2026</T></p>
                <h2 className="afu ad1 mt-2 text-4xl font-black leading-tight sm:text-5xl">{poolName}</h2>
                <div
                    className="afu ad2 mt-3 rounded-full bg-black/20 border border-white/20 px-5 py-1.5 text-xs font-black tracking-[0.25em] text-white/90">
                    <T>WRAPPED</T>
                </div>
                <div className="afu ad3 mt-5 flex items-center gap-3">
                    <div className="h-px w-10 bg-white/25 rounded-full"/>
                    <span className="text-white/40 text-sm">★ ★ ★</span>
                    <div className="h-px w-10 bg-white/25 rounded-full"/>
                </div>
                <p className="afu ad4 mt-4 max-w-xs text-sm font-semibold text-white/60 leading-relaxed">
                    <T>The votes are in. Let's see how it all played out.</T>
                </p>
            </div>
            <ShareBtn cardRef={cardRef} text={shareText}/>
        </div>
    )
}

export function SlideOverview({totalPlayers, totalMatches, totalPredictions}) {
    const cardRef = useRef(null)
    const shareText = `📊 Our pool had ${totalPlayers} players, ${totalMatches} matches, and ${totalPredictions} total picks!`
    return (
        <div ref={cardRef} className={`${slideBase} bg-blue-700`}>
            <Pattern/>
            <Glow/>
            <WaveBg/>
            <DriftOrbs/>
            <div className="relative flex flex-col items-center w-full">
                <div className="abi text-5xl mb-4">📊</div>
                <Label><T>By the Numbers</T></Label>
                <h3 className="afu ad1 mt-3 text-2xl font-black"><T>The Big Picture</T></h3>
                <p className="afu ad2 mt-1 text-sm text-white/55 font-semibold"><T>Here's what went down this
                    tournament</T></p>
                <div className="afu ad3 mt-7 grid grid-cols-3 gap-4 w-full max-w-sm">
                    {[
                        {value: totalPlayers, label: 'Players', emoji: '👥'},
                        {value: totalMatches, label: 'Matches', emoji: '⚽'},
                        {value: totalPredictions, label: 'Picks', emoji: '🎯'},
                    ].map(({value, label, emoji}) => (
                        <div key={label}
                             className="flex flex-col items-center rounded-2xl bg-black/15 border border-white/15 p-4">
                            <div className="text-2xl mb-1">{emoji}</div>
                            <div className="anp text-3xl font-black">{value}</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-white/55 mt-0.5">
                                <Var>{label}</Var></div>
                        </div>
                    ))}
                </div>
            </div>
            <ShareBtn cardRef={cardRef} text={shareText}/>
        </div>
    )
}

export function SlideChampion({winner, playerStatsById}) {
    const cardRef = useRef(null)
    if (!winner) return null
    const stats = playerStatsById?.get(winner.player)
    const accuracy = stats?.accuracy ?? winner.accuracy
    const shareText = `🏆 ${winner.name} won our World Cup 2026 pool with ${winner.points} pts and ${accuracy}% accuracy! 👑`
    return (
        <div ref={cardRef} className={slideBase}
             style={{background: 'linear-gradient(135deg, color-mix(in oklch, var(--color-primary) 30%, transparent), transparent 52%), linear-gradient(225deg, color-mix(in oklch, var(--color-accent) 28%, transparent), transparent 46%), var(--color-neutral)'}}>
            <Confetti/>
            <Pattern/>
            <Glow size="h-96 w-96" position="-top-28"/>
            <div className="relative flex flex-col items-center">
                <div className="abi afl mb-2 text-7xl leading-none">👑</div>
                <Label><T>Pool Champion</T></Label>
                <h2 className="afu ad1 mt-3 text-5xl font-black sm:text-6xl">{winner.name}</h2>
                <p className="afu ad1 mt-1.5 text-sm font-semibold text-white/60"><T>🎉 Congratulations!</T></p>
                <div className="afu ad2 mt-5 grid grid-cols-3 gap-3 w-full max-w-xs">
                    <StatCard value={winner.points} label="Points" emoji="⭐"/>
                    <StatCard value={winner.correct} label="Correct" emoji="✅"/>
                    <StatCard value={`${accuracy}%`} label="Accuracy" emoji="🎯"/>
                </div>
            </div>
            <ShareBtn cardRef={cardRef} text={shareText}/>
        </div>
    )
}

export function SlidePodium({top3}) {
    const cardRef = useRef(null)
    if (!top3?.length) return null
    const [first, second, third] = top3
    const shareText = `🥇 ${first?.name} 🥈 ${second?.name} 🥉 ${third?.name} — final standings!`
    const entries = [
        {player: second, medal: '🥈', height: 'h-28', bg: 'bg-black/10', border: 'border-white/15', order: 1},
        {player: first, medal: '🥇', height: 'h-40', bg: 'bg-white/15', border: 'border-white/25', order: 0},
        {player: third, medal: '🥉', height: 'h-20', bg: 'bg-black/15', border: 'border-white/10', order: 2},
    ].sort((a, b) => a.order - b.order)
    return (
        <div ref={cardRef} className={`${slideBase} bg-emerald-700`}>
            <Pattern/>
            <Glow/>
            <div className="relative flex flex-col items-center w-full">
                <div className="asi text-4xl mb-3">🏆</div>
                <Label><T>Final Standings</T></Label>
                <h3 className="afu ad1 mt-3 text-2xl font-black"><T>The Podium</T></h3>
                <div className="mt-6 flex items-end justify-center gap-3 w-full max-w-xs">
                    {entries.map(({player, medal, height, bg, border}, i) => (
                        <div key={player?.player || i} className="afu flex flex-col items-center flex-1"
                             style={{animationDelay: `${0.1 + i * 0.08}s`}}>
                            <div className="mb-2 text-4xl leading-none">{medal}</div>
                            <div
                                className={`flex flex-col items-center justify-end w-full rounded-t-2xl border ${bg} ${border} ${height} px-2 py-2`}
                                style={{animation: `barGrow 0.7s cubic-bezier(0.175,0.885,0.32,1.275) ${0.3 + i * 0.1}s both`}}
                            >
                                <div
                                    className="text-sm font-black truncate w-full text-center">{player?.name || '—'}</div>
                                <div className="text-xs font-bold text-white/55 mt-0.5">{player?.points ?? 0} pts</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <ShareBtn cardRef={cardRef} text={shareText}/>
        </div>
    )
}

export function SlideWoodenSpoon({lastPlace, totalPlayers}) {
    const cardRef = useRef(null)
    if (!lastPlace) return null
    const shareText = `🪵 ${lastPlace.name} got the wooden spoon (${lastPlace.points} pts). Better luck in 2030!`
    return (
        <div ref={cardRef} className={`${slideBase} bg-stone-600`}>
            <Pattern/>
            <Glow/>
            <WaveBg/>
            <div className="relative flex flex-col items-center">
                <div className="abi afl mb-3 text-6xl leading-none">🪵</div>
                <Label><T>Position <Var>{totalPlayers}</Var> of <Var>{totalPlayers}</Var></T></Label>
                <h3 className="afu ad1 mt-3 text-4xl font-black">{lastPlace.name}</h3>
                <div
                    className="afu ad2 mt-4 flex items-center gap-2 rounded-2xl bg-black/15 border border-white/15 px-5 py-2.5">
                    <span className="text-lg font-black">{lastPlace.points} <T>pts</T></span>
                    <span className="text-white/30">·</span>
                    <span className="text-sm font-semibold text-white/60">{lastPlace.correct} <T>correct</T></span>
                    <span className="text-white/30">·</span>
                    <span className="text-sm font-semibold text-white/60">{lastPlace.accuracy}%</span>
                </div>
                <p className="afu ad3 mt-5 max-w-xs text-sm italic text-white/55 leading-relaxed">
                    <T>"The wooden spoon winner — the heart of every pool. Next time will be different."</T> 💪
                </p>
            </div>
            <ShareBtn cardRef={cardRef} text={shareText}/>
        </div>
    )
}

export function SlideBestStreak({streak}) {
    const cardRef = useRef(null)
    if (!streak?.playerId) return null
    const shareText = `🔥 ${streak.name} had ${streak.length} correct predictions IN A ROW! Absolutely unstoppable!`
    return (
        <div ref={cardRef} className={slideBase}
             style={{background: 'linear-gradient(135deg, color-mix(in oklch, var(--color-secondary) 40%, transparent), transparent 50%), var(--color-neutral)'}}>
            <FireParticles/>
            <Pattern/>
            <Glow size="h-72 w-72" position="-top-12"/>
            <div className="relative flex flex-col items-center">
                <div className="abi mb-4 text-6xl leading-none">🔥</div>
                <Label><T>Hottest Streak</T></Label>
                <h3 className="afu ad1 mt-3 text-3xl font-black">{streak.name}</h3>
                <div className="afu ad2 mt-4 flex items-baseline gap-2">
                    <span className="anp text-8xl font-black tracking-tighter">{streak.length}</span>
                    <span className="text-xl font-semibold text-white/65"><T>in a row</T></span>
                </div>
                <p className="text-sm font-bold text-white/60"><T>correct predictions</T></p>
                <div className="afu ad3 mt-3 flex gap-0.5 text-xl flex-wrap justify-center max-w-[260px]">
                    {Array.from({length: Math.min(streak.length, 10)}, (_, i) => (
                        <span key={i} style={{
                            animationDelay: `${0.5 + i * 0.04}s`,
                            animation: 'fadeUp 0.4s ease-out both'
                        }}>🔥</span>
                    ))}
                    {streak.length > 10 &&
                        <span className="text-xs font-black text-white/70 self-end mb-0.5">+{streak.length - 10}</span>}
                </div>
            </div>
            <ShareBtn cardRef={cardRef} text={shareText}/>
        </div>
    )
}

export function SlideWorstStreak({streak}) {
    const cardRef = useRef(null)
    if (!streak?.playerId) return null
    const shareText = `😬 ${streak.name} had ${streak.length} wrong predictions in a row. The football gods were not kind.`
    return (
        <div ref={cardRef} className={`${slideBase} bg-slate-700`}>
            <Pattern/>
            <Glow/>
            <Shimmer/>
            <div className="relative flex flex-col items-center">
                <div className="abi afl mb-3 text-6xl leading-none">😬</div>
                <Label><T>Toughest Run</T></Label>
                <h3 className="afu ad1 mt-3 text-3xl font-black">{streak.name}</h3>
                <div className="afu ad2 mt-4 flex items-baseline gap-2">
                    <span className="anp text-8xl font-black tracking-tighter">{streak.length}</span>
                    <span className="text-xl font-semibold text-white/60"><T>in a row</T></span>
                </div>
                <p className="text-sm font-bold text-white/55"><T>wrong predictions</T></p>
                <p className="afu ad3 mt-5 max-w-xs text-sm italic text-white/45 leading-relaxed">
                    <T>"The football gods were merciless. They'll be back stronger in 2030."</T> 🙏
                </p>
            </div>
            <ShareBtn cardRef={cardRef} text={shareText}/>
        </div>
    )
}

export function SlideTopAccuracy({player}) {
    const cardRef = useRef(null)
    if (!player) return null
    const shareText = `🎯 ${player.name} was the sharpshooter — ${player.accuracy}% accuracy (${player.correct}/${player.total})!`
    return (
        <div ref={cardRef} className={`${slideBase} bg-violet-700`}>
            <Pattern/>
            <Glow/>
            <Shimmer/>
            <DriftOrbs/>
            <div className="relative flex flex-col items-center">
                <div className="abi afl mb-3 text-6xl leading-none">🎯</div>
                <Label><T>Sharpshooter</T></Label>
                <h3 className="afu ad1 mt-3 text-3xl font-black">{player.name}</h3>
                <div className="afu ad2 mt-4">
                    <span className="anp text-8xl font-black tracking-tighter">{player.accuracy}%</span>
                </div>
                <p className="text-sm font-bold text-white/60"><T>accuracy</T></p>
                <div className="afu ad3 mt-4 w-full max-w-[240px]">
                    <div className="h-2 w-full rounded-full bg-black/20 overflow-hidden">
                        <div className="h-full rounded-full bg-white/75"
                             style={{
                                 '--target-width': `${player.accuracy}%`,
                                 width: `${player.accuracy}%`,
                                 animation: 'widthGrow 1s cubic-bezier(0.175,0.885,0.32,1.275) 0.6s both'
                             }}/>
                    </div>
                    <div className="mt-2 flex justify-between text-xs font-bold text-white/40">
                        <span>0%</span>
                        <span>{player.correct}/{player.total} <T>correct</T></span>
                        <span>100%</span>
                    </div>
                </div>
                <p className="afu ad4 mt-4 text-sm italic text-white/45"><T>When they picked, they picked right.</T></p>
            </div>
            <ShareBtn cardRef={cardRef} text={shareText}/>
        </div>
    )
}

export function SlideDarkHorse({player, overallLb}) {
    const cardRef = useRef(null)
    if (!player) return null
    const rank = overallLb?.find((l) => l.player === player.playerId)?.rank || '—'
    const shareText = `🐎 ${player.name} was our dark horse — ranked #${rank} but with ${player.accuracy}% accuracy!`
    return (
        <div ref={cardRef} className={`${slideBase} bg-teal-700`}>
            <Pattern/>
            <Glow/>
            <DriftOrbs/>
            <div className="relative flex flex-col items-center">
                <div className="abi afl mb-3 text-6xl leading-none">🐎</div>
                <Label><T context="a sports competition term for surprise competitor">Dark Horse</T></Label>
                <h3 className="afu ad1 mt-3 text-3xl font-black">{player.name}</h3>
                <p className="afu ad1 mt-1 text-sm font-semibold text-white/55"><T>Quietly crushing it</T></p>
                <div
                    className="afu ad2 mt-4 flex items-stretch gap-4 rounded-2xl bg-black/15 border border-white/15 px-7 py-3">
                    <div className="text-center">
                        <div className="text-2xl font-black">#{rank}</div>
                        <div className="text-[10px] font-bold uppercase text-white/45 tracking-widest mt-0.5">
                            <T>Rank</T></div>
                    </div>
                    <div className="w-px bg-white/15 self-stretch"/>
                    <div className="text-center">
                        <div className="text-2xl font-black">{player.accuracy}%</div>
                        <div className="text-[10px] font-bold uppercase text-white/45 tracking-widest mt-0.5">
                            <T>Accuracy</T></div>
                    </div>
                </div>
                <p className="afu ad3 mt-5 max-w-xs text-sm italic text-white/45 leading-relaxed">
                    <T>"They may not have won the pool, but they definitely know ball."</T>
                </p>
            </div>
            <ShareBtn cardRef={cardRef} text={shareText}/>
        </div>
    )
}

export function SlideGroupStageGuru({player}) {
    const cardRef = useRef(null)
    if (!player) return null
    const pct = player.total > 0 ? Math.round((player.correct / player.total) * 100) : 0
    const shareText = `🏟️ ${player.name} was the Group Stage Guru — ${player.correct}/${player.total} correct (${pct}%)!`
    return (
        <div ref={cardRef} className={`${slideBase} bg-sky-600`}>
            <Pattern/>
            <Glow/>
            <WaveBg/>
            <div className="relative flex flex-col items-center">
                <div className="abi afl mb-3 text-6xl leading-none">🏟️</div>
                <Label><T>Group Stage Guru</T></Label>
                <h3 className="afu ad1 mt-3 text-3xl font-black">{player.name}</h3>
                <div className="afu ad2 mt-4 flex items-baseline gap-1">
                    <span className="anp text-7xl font-black tracking-tighter">{player.correct}</span>
                    <span className="text-2xl font-bold text-white/55">/{player.total}</span>
                </div>
                <p className="text-sm font-bold text-white/60"><T>correct in group stage</T></p>
                <div
                    className="afu ad3 mt-3 rounded-full bg-black/20 border border-white/20 px-4 py-1.5 text-sm font-black">
                    <T><Var>{pct}</Var>% accuracy in groups</T>
                </div>
                <p className="mt-4 text-sm italic text-white/40"><T>Groups? Their personal playground.</T></p>
            </div>
            <ShareBtn cardRef={cardRef} text={shareText}/>
        </div>
    )
}

export function SlideKnockoutKing({player}) {
    const cardRef = useRef(null)
    if (!player) return null
    const pct = player.total > 0 ? Math.round((player.correct / player.total) * 100) : 0
    const shareText = `⚔️ ${player.name} was the Knockout King — ${player.correct}/${player.total} correct in elimination rounds!`
    return (
        <div ref={cardRef} className={`${slideBase} bg-rose-700`}>
            <Pattern/>
            <Glow/>
            <Shimmer/>
            <div className="relative flex flex-col items-center">
                <div className="abi afl mb-3 text-6xl leading-none">⚔️</div>
                <Label><T>Knockout King</T></Label>
                <h3 className="afu ad1 mt-3 text-3xl font-black">{player.name}</h3>
                <div className="afu ad2 mt-4 flex items-baseline gap-1">
                    <span className="anp text-7xl font-black tracking-tighter">{player.correct}</span>
                    <span className="text-2xl font-bold text-white/55">/{player.total}</span>
                </div>
                <p className="text-sm font-bold text-white/60"><T>correct in knockouts</T></p>
                <div
                    className="afu ad3 mt-3 rounded-full bg-black/20 border border-white/20 px-4 py-1.5 text-sm font-black">
                    <T><Var>{pct}</Var>% in the knockouts</T>
                </div>
                <p className="mt-4 text-sm italic text-white/40"><T>When the pressure was on, they delivered.</T></p>
            </div>
            <ShareBtn cardRef={cardRef} text={shareText}/>
        </div>
    )
}

export function SlideBoldPrediction({match, wrongPct, matchPredictionCounts}) {
    const cardRef = useRef(null)
    if (!match) return null
    const matchCounts = matchPredictionCounts?.get(match.match?.id) || {home: 0, draw: 0, away: 0}
    const total = matchCounts.home + matchCounts.draw + matchCounts.away
    const shareText = `🤯 ${wrongPct}% of our pool got ${match.match?.home} vs ${match.match?.away} wrong! Only ${match.correctCount} called it.`
    return (
        <div ref={cardRef} className={`${slideBase} bg-fuchsia-700`}>
            <Pattern/>
            <Glow/>
            <DriftOrbs/>
            <div className="relative flex flex-col items-center">
                <div className="abi afl mb-3 text-6xl leading-none">🤯</div>
                <Label><T>Biggest Upset</T></Label>
                <div className="afu ad1 mt-3 flex items-center justify-center gap-4 flex-wrap">
                    <div className="flex flex-col items-end gap-1 w-24">
                        {match.match?.homeCrest && <img src={match.match.homeCrest} alt=""
                                                        className="h-8 w-12 rounded-sm object-cover shadow-sm"/>}
                        <span className="text-lg font-black leading-tight text-right w-full">{match.match?.home}</span>
                    </div>
                    <span className="text-white/50 text-base font-bold self-center">vs</span>
                    <div className="flex flex-col items-start gap-1 w-24">
                        {match.match?.awayCrest && <img src={match.match.awayCrest} alt=""
                                                        className="h-8 w-12 rounded-sm object-cover shadow-sm"/>}
                        <span className="text-lg font-black leading-tight w-full">{match.match?.away}</span>
                    </div>
                </div>
                <div className="afu ad2 mt-3">
                    <span className="anp text-7xl font-black tracking-tighter">{wrongPct}%</span>
                </div>
                <p className="text-sm font-bold text-white/60"><T>of the pool got this wrong</T></p>
                {total > 0 && (
                    <div className="afu ad3 mt-4 w-full max-w-[280px]">
                        <div className="flex gap-0.5 rounded-xl overflow-hidden h-8 border border-white/15">
                            {[
                                {label: match.match?.home, count: matchCounts.home, bg: 'bg-white/30'},
                                {label: 'Draw', count: matchCounts.draw, bg: 'bg-black/20'},
                                {label: match.match?.away, count: matchCounts.away, bg: 'bg-white/15'},
                            ].map(({label, count, bg}) => {
                                const pct = total > 0 ? (count / total) * 100 : 0
                                return pct > 0 ? (
                                    <div key={label}
                                         className={`${bg} flex items-center justify-center text-[10px] font-black text-white`}
                                         style={{width: `${Math.max(pct, 4)}%`}}>
                                        {pct > 14 ? `${Math.round(pct)}%` : ''}
                                    </div>
                                ) : null
                            })}
                        </div>

                    </div>
                )}
                <p className="mt-3 text-sm italic text-white/45">
                    <T>Only <Var>{match.correctCount}</Var> brave soul<Var>{match.correctCount !== 1 ? 's' : ''}</Var> called it
                        right.</T>
                </p>
            </div>
            <ShareBtn cardRef={cardRef} text={shareText}/>
        </div>
    )
}

export function SlideMostDivided({match, home, draw, away}) {
    const cardRef = useRef(null)
    if (!match) return null
    const total = (home || 0) + (draw || 0) + (away || 0)
    const shareText = `⚡ Most divided: ${match.home} vs ${match.away} — split ${home}/${draw}/${away}. Nobody could agree!`
    return (
        <div ref={cardRef} className={`${slideBase} bg-amber-600`}>
            <Pattern/>
            <Glow/>
            <WaveBg/>
            <div className="relative flex flex-col items-center w-full">
                <div className="abi afl mb-3 text-6xl leading-none">⚡</div>
                <Label><T>Most Divided Match</T></Label>
                <div className="afu ad1 mt-8 flex items-center justify-center gap-4 flex-wrap">
                    <div className="flex flex-col items-end gap-1 w-24">
                        {match.homeCrest &&
                            <img src={match.homeCrest} alt="" className="h-8 w-12 rounded-sm object-cover shadow-sm"/>}
                        <span className="text-lg font-black leading-tight text-right w-full">{match.home}</span>
                    </div>
                    <span className="text-white/50 text-base font-bold self-center">vs</span>
                    <div className="flex flex-col items-start gap-1 w-24">
                        {match.awayCrest &&
                            <img src={match.awayCrest} alt="" className="h-8 w-12 rounded-sm object-cover shadow-sm"/>}
                        <span className="text-lg font-black leading-tight w-full">{match.away}</span>
                    </div>
                </div>
                <p className="afu ad2 mt-3 text-xs font-semibold text-white/55"><T>Nobody could agree on this one</T>
                </p>
                {total > 0 && (
                    <>
                        <div
                            className="afu ad4 mt-8 flex w-full max-w-[280px] gap-0.5 rounded-xl overflow-hidden h-10 border border-white/15">
                            {[
                                {pct: (home || 0) / total, bg: 'bg-white/35', label: match.home},
                                {pct: (draw || 0) / total, bg: 'bg-black/20', label: 'Draw'},
                                {pct: (away || 0) / total, bg: 'bg-white/18', label: match.away},
                            ].map(({pct, bg, label}) => (
                                <div key={label}
                                     className={`${bg} flex items-center justify-center text-[11px] font-black text-white`}
                                     style={{width: `${Math.max(pct * 100, pct > 0 ? 5 : 0)}%`}}>
                                    {pct > 0.17 ? `${Math.round(pct * 100)}%` : ''}
                                </div>
                            ))}
                        </div>

                    </>
                )}
            </div>
            <ShareBtn cardRef={cardRef} text={shareText}/>
        </div>
    )
}

export function SlidePlayerStat({player, playerStats, overallLb}) {
    const cardRef = useRef(null)
    if (!player) return null
    const stats = playerStats.find((s) => s.playerId === player.player || s.playerId === player.id)
    if (!stats) return null
    const rank = overallLb?.find((l) => l.player === player.player || l.player === player.id)?.rank || '—'
    const totalPlayers = overallLb?.length || 0
    const topPct = rank !== '—' && totalPlayers > 0 ? Math.round(((totalPlayers - rank) / totalPlayers) * 100) : null
    const shareText = `👤 My Wrapped: #${rank} place · ${stats.points} pts · ${stats.correct} correct · ${stats.accuracy}% accuracy`
    return (
        <div ref={cardRef} className={`${slideBase} bg-indigo-600`}>
            <Pattern/>
            <Glow/>
            <Shimmer/>
            <DriftOrbs/>
            <div className="relative flex flex-col items-center w-full">
                <div className="abi mb-3">
                    <PlayerAvatar name={stats.name} size={60} className="ring-2 ring-white/30"/>
                </div>
                <Label><T>Your Wrapped</T></Label>
                <h3 className="afu ad1 mt-3 text-3xl font-black">{stats.name}</h3>
                {topPct !== null && (
                    <p className="afu ad1 mt-1 text-sm font-semibold text-white/60">
                        <T>Top</T> <span className="font-black text-white">{100 - topPct}%</span> <T>of the pool</T> 🎉
                    </p>
                )}
                <div className="afu ad2 mt-5 grid w-full max-w-[280px] grid-cols-2 gap-3">
                    <StatCard value={`#${rank}`} label="Rank" emoji="🏅"/>
                    <StatCard value={stats.points} label="Points" emoji="⭐"/>
                    <StatCard value={stats.correct} label="Correct" emoji="✅"/>
                    <StatCard value={`${stats.accuracy}%`} label="Accuracy" emoji="🎯"/>
                </div>
                <div className="afu ad3 mt-4 w-full max-w-[280px]">
                    <div className="flex justify-between text-[10px] font-bold text-white/40 mb-1">
                        <span><T>Accuracy</T></span><span>{stats.accuracy}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-black/20 overflow-hidden">
                        <div className="h-full rounded-full bg-white/75"
                             style={{
                                 '--target-width': `${stats.accuracy}%`,
                                 width: `${stats.accuracy}%`,
                                 animation: 'widthGrow 1s cubic-bezier(0.175,0.885,0.32,1.275) 0.7s both'
                             }}/>
                    </div>
                </div>
            </div>
            <ShareBtn cardRef={cardRef} text={shareText}/>
        </div>
    )
}

export function SlideThanks({onRestart}) {
    const cardRef = useRef(null)
    const shareText = '⚽ World Cup 2026 Pool Wrapped — what a ride! Thanks for playing!'
    return (
        <div ref={cardRef} className={`${slideBase} bg-emerald-600`}>
            <Pattern/>
            <Glow/>
            <DriftOrbs/>
            <div className="relative flex flex-col items-center">
                <div className="abi afl mb-4 text-6xl leading-none">🙏</div>
                <Label><T>That's a Wrap</T></Label>
                <h2 className="afu ad1 mt-3 text-4xl font-black"><T>Thanks for Playing!</T></h2>
                <div className="afu ad2 mt-3 flex gap-2 text-2xl">
                    <span>⚽</span><span>🏆</span><span>🎉</span><span>🌟</span><span>⚽</span>
                </div>
                <p className="afu ad3 mt-4 max-w-xs text-sm font-semibold text-white/60 leading-relaxed">
                    <T>What a tournament! See you in 2030 — or maybe we'll find another competition before then.</T>
                </p>
                <div className="afu ad4 mt-4 flex items-center gap-3">
                    <div className="h-px w-10 bg-white/20 rounded-full"/>
                    <span className="text-xs font-bold text-white/30"><T>Until next time</T></span>
                    <div className="h-px w-10 bg-white/20 rounded-full"/>
                </div>
                {onRestart && (
                    <button
                        type="button"
                        data-html-to-image-ignore="true"
                        onClick={onRestart}
                        className="afu ad5 mt-5 flex cursor-pointer items-center gap-2 rounded-full bg-white/15 border border-white/25 px-6 py-3 text-sm font-black text-white transition-all hover:bg-white/25 hover:scale-105 active:scale-95"
                    >
                        <RotateCcw size={15}/>
                        <T>Watch it again</T>
                    </button>
                )}
            </div>
            <ShareBtn cardRef={cardRef} text={shareText}/>
        </div>
    )
}

export function SlideEmpty() {
    return (
        <div className={`${slideBase} bg-slate-600`}>
            <Pattern/>
            <Glow/>
            <div className="relative flex flex-col items-center">
                <div className="mb-4 text-5xl">⏳</div>
                <h3 className="text-2xl font-black"><T>Not enough data yet</T></h3>
                <p className="mt-3 max-w-xs text-sm text-white/60 leading-relaxed">
                    <T>Come back after the tournament ends to see your pool wrapped.</T>
                </p>
            </div>
        </div>
    )
}
