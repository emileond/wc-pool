import { useState } from 'react'
import {
  SlideCover,
  SlideOverview,
  SlideChampion,
  SlidePodium,
  SlideWoodenSpoon,
  SlideBestStreak,
  SlideWorstStreak,
  SlideTopAccuracy,
  SlideDarkHorse,
  SlideGroupStageGuru,
  SlideKnockoutKing,
  SlideBoldPrediction,
  SlideMostDivided,
  SlidePlayerStat,
  SlideThanks,
} from './slides/WrappedSlides'

const DEMO_PLAYER_STATS = [
  { playerId: 'p1', name: 'Sarah', correct: 42, wrong: 8, total: 50, accuracy: 84, points: 126 },
  { playerId: 'p2', name: 'Mike', correct: 38, wrong: 12, total: 50, accuracy: 76, points: 114 },
  { playerId: 'p3', name: 'Jenna', correct: 35, wrong: 15, total: 50, accuracy: 70, points: 105 },
  { playerId: 'p4', name: 'Alex', correct: 28, wrong: 22, total: 50, accuracy: 56, points: 84 },
  { playerId: 'p5', name: 'Chris', correct: 22, wrong: 28, total: 50, accuracy: 44, points: 66 },
  { playerId: 'p6', name: 'Taylor', correct: 18, wrong: 32, total: 50, accuracy: 36, points: 54 },
]

const DEMO_LB = [
  { player: 'p1', name: 'Sarah', points: 126, correct: 42, accuracy: 84, rank: 1 },
  { player: 'p2', name: 'Mike', points: 114, correct: 38, accuracy: 76, rank: 2 },
  { player: 'p3', name: 'Jenna', points: 105, correct: 35, accuracy: 70, rank: 3 },
  { player: 'p4', name: 'Alex', points: 84, correct: 28, accuracy: 56, rank: 4 },
  { player: 'p5', name: 'Chris', points: 66, correct: 22, accuracy: 44, rank: 5 },
  { player: 'p6', name: 'Taylor', points: 54, correct: 18, accuracy: 36, rank: 6 },
]

const DEMO_STREAK = { playerId: 'p1', name: 'Sarah', length: 9, type: 'win' }
const DEMO_WORST_STREAK = { playerId: 'p5', name: 'Chris', length: 7, type: 'lose' }
const DEMO_ACCURACY = { name: 'Sarah', accuracy: 84, correct: 42, total: 50 }
const DEMO_DARK_HORSE = { playerId: 'p4', name: 'Alex', accuracy: 56 }
const DEMO_GROUP_GURU = { name: 'Mike', correct: 28, total: 32 }
const DEMO_KNOCKOUT_KING = { name: 'Jenna', correct: 12, total: 16 }
const DEMO_BOLD = { match: { id: 'm-b', home: 'Brazil', away: 'Argentina' }, wrongPct: 82, correctCount: 3 }
const DEMO_DIVIDED = { match: { home: 'Germany', away: 'France' }, home: 8, draw: 7, away: 9 }
const DEMO_MATCH_COUNTS = new Map([
  ['m-b', { home: 5, draw: 1, away: 40 }],
])

const DEMO_PLAYER = { player: 'p1', id: 'p1' }

const ALL_SLIDES = [
  { id: 'cover', label: 'Cover', component: SlideCover, props: { poolName: 'Family Cup' } },
  { id: 'overview', label: 'Overview', component: SlideOverview, props: { totalPlayers: 6, totalMatches: 48, totalPredictions: 280 } },
  { id: 'champion', label: 'Champion', component: SlideChampion, props: { winner: DEMO_LB[0], playerStatsById: new Map(DEMO_PLAYER_STATS.map((s) => [s.playerId, s])) } },
  { id: 'podium', label: 'Podium', component: SlidePodium, props: { top3: DEMO_LB.slice(0, 3) } },
  { id: 'spoon', label: 'Wooden Spoon', component: SlideWoodenSpoon, props: { lastPlace: DEMO_LB[5], totalPlayers: 6 } },
  { id: 'streak', label: 'Best Streak', component: SlideBestStreak, props: { streak: DEMO_STREAK } },
  { id: 'worst-streak', label: 'Worst Streak', component: SlideWorstStreak, props: { streak: DEMO_WORST_STREAK } },
  { id: 'accuracy', label: 'Top Accuracy', component: SlideTopAccuracy, props: { player: DEMO_ACCURACY } },
  { id: 'dark-horse', label: 'Dark Horse', component: SlideDarkHorse, props: { player: DEMO_DARK_HORSE, overallLb: DEMO_LB } },
  { id: 'group-guru', label: 'Group Guru', component: SlideGroupStageGuru, props: { player: DEMO_GROUP_GURU } },
  { id: 'knockout-king', label: 'Knockout King', component: SlideKnockoutKing, props: { player: DEMO_KNOCKOUT_KING } },
  { id: 'bold', label: 'Bold Prediction', component: SlideBoldPrediction, props: { match: DEMO_BOLD, wrongPct: DEMO_BOLD.wrongPct, matchPredictionCounts: DEMO_MATCH_COUNTS } },
  { id: 'divided', label: 'Most Divided', component: SlideMostDivided, props: { ...DEMO_DIVIDED } },
  { id: 'player', label: 'Player Stat', component: SlidePlayerStat, props: { player: DEMO_PLAYER, playerStats: DEMO_PLAYER_STATS, overallLb: DEMO_LB } },
  { id: 'thanks', label: 'Thanks', component: SlideThanks, props: {} },
]

export default function WrappedDemoPage() {
  const [activeSlide, setActiveSlide] = useState(ALL_SLIDES[0].id)

  const current = ALL_SLIDES.find((s) => s.id === activeSlide) || ALL_SLIDES[0]
  const Slide = current.component

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-black mb-2">Wrapped Demo</h1>
      <p className="text-base-content/50 text-sm mb-8">
        Preview all possible slides with sample data. When the tournament is over, these show with real data.
      </p>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <nav className="space-y-1">
          {ALL_SLIDES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSlide(s.id)}
              className={`w-full text-left rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
                activeSlide === s.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-base-content/60 hover:bg-base-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="mx-auto w-full max-w-lg">
          <div className="mb-3 text-xs font-semibold text-base-content/40">
            {current.label}
          </div>
          <Slide {...current.props} />
        </div>
      </div>
    </div>
  )
}
