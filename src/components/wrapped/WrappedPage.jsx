import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import usePoolWrapped from '../../hooks/react-query/usePoolWrapped'
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
  SlideEmpty,
  animStyles,
} from './slides/WrappedSlides'

export default function WrappedPage({ players, matches, predictions, leaderboard, player, poolName }) {
  const wrapped = usePoolWrapped({ players, matches, predictions, leaderboard })
  const [slideIndex, setSlideIndex] = useState(0)
  const [direction, setDirection] = useState('right')
  const [touchStart, setTouchStart] = useState(null)

  const slides = useMemo(() => {
    if (!wrapped) return []
    const {
      totalPlayers, totalMatches, totalPredictions,
      winner, lastPlace, top3,
      topAccuracy, darkHorse,
      bestGroupPlayer, bestKnockoutPlayer,
      bestStreak, worstStreak,
      boldestMatch, mostDividedMatch,
      playerStats, playerStatsById, overallLb, matchPredictionCounts,
    } = wrapped

    const list = [
      { id: 'cover', component: SlideCover, props: { poolName: poolName || 'The Pool' } },
      { id: 'overview', component: SlideOverview, props: { totalPlayers, totalMatches, totalPredictions } },
      { id: 'champion', component: SlideChampion, props: { winner, playerStatsById } },
      { id: 'podium', component: SlidePodium, props: { top3 } },
      { id: 'spoon', component: SlideWoodenSpoon, props: { lastPlace, totalPlayers } },
    ]

    if (bestStreak.length > 1) list.push({ id: 'streak', component: SlideBestStreak, props: { streak: bestStreak } })
    if (worstStreak.length > 1) list.push({ id: 'worst-streak', component: SlideWorstStreak, props: { streak: worstStreak } })
    if (topAccuracy) list.push({ id: 'accuracy', component: SlideTopAccuracy, props: { player: topAccuracy } })
    if (darkHorse) list.push({ id: 'dark-horse', component: SlideDarkHorse, props: { player: darkHorse, overallLb } })
    if (bestGroupPlayer) list.push({ id: 'group-guru', component: SlideGroupStageGuru, props: { player: bestGroupPlayer } })
    if (bestKnockoutPlayer) list.push({ id: 'knockout-king', component: SlideKnockoutKing, props: { player: bestKnockoutPlayer } })
    if (boldestMatch) list.push({ id: 'bold', component: SlideBoldPrediction, props: { match: boldestMatch, wrongPct: boldestMatch.wrongPct, matchPredictionCounts } })
    if (mostDividedMatch) list.push({ id: 'divided', component: SlideMostDivided, props: { match: mostDividedMatch.match, ...mostDividedMatch } })
    if (player) list.push({ id: 'player-stat', component: SlidePlayerStat, props: { player, playerStats, overallLb } })
    list.push({ id: 'thanks', component: SlideThanks, props: {} })

    return list
  }, [wrapped, player, poolName])

  function goNext() {
    if (slideIndex < slides.length - 1) {
      setDirection('right')
      setSlideIndex(slideIndex + 1)
    } else {
      setDirection('right')
      setSlideIndex(0)
    }
  }

  function goPrev() {
    if (slideIndex > 0) {
      setDirection('left')
      setSlideIndex(slideIndex - 1)
    }
  }

  function goTo(i) {
    setDirection(i > slideIndex ? 'right' : 'left')
    setSlideIndex(i)
  }

  function restart() {
    setDirection('right')
    setSlideIndex(0)
  }

  function handleTouchStart(e) {
    setTouchStart(e.touches[0].clientX)
  }

  function handleTouchEnd(e) {
    if (touchStart === null) return
    const diff = touchStart - e.changedTouches[0].clientX
    if (Math.abs(diff) > 48) {
      if (diff > 0) goNext()
      else goPrev()
    }
    setTouchStart(null)
  }

  if (!slides.length) {
    return <SlideEmpty />
  }

  const CurrentSlide = slides[slideIndex].component
  const currentProps = slides[slideIndex].props
  const isFirst = slideIndex === 0
  const isLast = slideIndex === slides.length - 1

  return (
    <div className="w-full select-none">
      <style>{animStyles}</style>

      {/* Header */}
      <div className="mb-3 flex items-center justify-between text-xs font-semibold text-base-content/40">
        <span>{poolName || 'Pool'} Wrapped</span>
        <span className="tabular-nums">{slideIndex + 1} / {slides.length}</span>
      </div>

      {/* Story-style progress bar */}
      <div className="mb-4 flex gap-1">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => goTo(i)}
            className="group flex-1 h-1.5 cursor-pointer overflow-hidden rounded-full bg-base-300 transition-all hover:h-2"
            aria-label={`Go to slide ${i + 1}`}
          >
            <div
              className={`h-full rounded-full bg-primary transition-all duration-500 ${
                i < slideIndex ? 'w-full' : i === slideIndex ? 'w-full' : 'w-0'
              } ${i === slideIndex ? 'opacity-100' : i < slideIndex ? 'opacity-70' : 'opacity-0'}`}
            />
          </button>
        ))}
      </div>

      {/* Slide */}
      <div
        className="relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          key={`${slideIndex}-${direction}`}
          className={direction === 'right' ? 'slide-enter-right' : 'slide-enter-left'}
        >
          <CurrentSlide {...currentProps} onRestart={restart} />
        </div>

        {/* Navigation */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={isFirst}
            className="btn btn-ghost rounded-2xl font-bold disabled:opacity-25 transition-all hover:scale-105 active:scale-95"
          >
            <ChevronLeft size={18} />
            Back
          </button>

          {/* Dot indicators (compact) */}
          <div className="flex gap-1.5 flex-wrap justify-center flex-1 max-w-[160px]">
            {slides.length <= 12 && slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goTo(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === slideIndex
                    ? 'w-4 h-1.5 bg-primary'
                    : 'w-1.5 h-1.5 bg-base-300 hover:bg-base-content/30'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={goNext}
            className="btn btn-primary rounded-2xl font-bold transition-all hover:scale-105 active:scale-95"
          >
            {isLast ? 'Replay ↩' : 'Next'}
            {!isLast && <ChevronRight size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}
