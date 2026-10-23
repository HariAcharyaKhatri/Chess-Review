import React from 'react';
import { Award, TrendingUp, AlertTriangle, Target, BookOpen, X, CheckCircle2, ChevronRight } from 'lucide-react';
import { PersonalizedImprovementPlan } from '../../services/improvementService';

interface ImprovementPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan?: PersonalizedImprovementPlan;
  onLaunchMistakeTrainer?: () => void;
  onLaunchOpeningCoach?: () => void;
}

export const ImprovementPlanModal: React.FC<ImprovementPlanModalProps> = ({
  isOpen,
  onClose,
  plan,
  onLaunchMistakeTrainer,
  onLaunchOpeningCoach,
}) => {
  if (!isOpen || !plan) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Personalized Improvement Plan</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-400 font-mono">
                  {plan.overallAccuracy}% Accuracy
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Actionable game breakdown and targeted training recommendations for{' '}
                <strong className="text-slate-200">{plan.playerFocus}</strong> ({plan.playerColor}).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Action Callouts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {plan.practicePositions.length > 0 && onLaunchMistakeTrainer && (
              <button
                onClick={() => {
                  onClose();
                  onLaunchMistakeTrainer();
                }}
                className="p-4 rounded-xl bg-rose-950/30 hover:bg-rose-950/50 border border-rose-500/40 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-rose-300 flex items-center gap-1.5">
                    <Target className="h-4 w-4 text-rose-400" />
                    <span>Drill Your Mistakes</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-rose-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-slate-400">
                  Interactive replay of {plan.practicePositions.length} blunders &amp; tactical mistakes from this game.
                </p>
              </button>
            )}

            {plan.openingAdvice && onLaunchOpeningCoach && (
              <button
                onClick={() => {
                  onClose();
                  onLaunchOpeningCoach();
                }}
                className="p-4 rounded-xl bg-emerald-950/30 hover:bg-emerald-950/50 border border-emerald-500/40 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-emerald-300 flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-emerald-400" />
                    <span>Opening Coach &amp; Replay</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-slate-400">
                  {plan.openingAdvice.openingName} ({plan.openingAdvice.eco}) theory and recommended variations.
                </p>
              </button>
            )}
          </div>

          {/* Key Strengths */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              <span>Key Strengths Exhibited</span>
            </h3>
            <ul className="space-y-2">
              {plan.strengths.map((str, idx) => (
                <li key={idx} className="flex items-start gap-2 text-slate-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Top Priority Weaknesses */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              <span>Top Areas for Improvement</span>
            </h3>
            <ul className="space-y-2">
              {plan.weaknesses.map((weak, idx) => (
                <li key={idx} className="flex items-start gap-2 text-slate-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400 shrink-0 mt-1.5" />
                  <span>{weak}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Actionable Training Plan */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" />
              <span>Recommended Training Exercises</span>
            </h3>
            <ul className="space-y-2">
              {plan.priorityActions.map((act, idx) => (
                <li key={idx} className="flex items-start gap-2 text-slate-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                  <span>{act}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
