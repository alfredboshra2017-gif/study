import React, { useState } from 'react';
import { BookOpenCheck, ShieldCheck, ArrowRight, Layers, BarChart3, Clock } from 'lucide-react';
import { useStudy } from '../context/StudyContext.tsx';

const HERO_IMAGE = '/src/assets/images/study_sanctuary_hero_1794522423694.jpg';

export function AuthGate() {
  const { signInWithGoogle } = useStudy();
  const [signingIn, setSigningIn] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleLogin = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070B] text-[#F4F3F8] flex flex-col lg:flex-row">
      {/* Left: Editorial Sanctuary Panel */}
      <div className="relative lg:w-[54%] min-h-[340px] lg:min-h-screen overflow-hidden border-b lg:border-b-0 lg:border-r border-[#1F1E2E] flex flex-col justify-between p-8 lg:p-14">
        {!imgError ? (
          <img
            src={HERO_IMAGE}
            alt="Obsidian study desk with warm lamp and notebook"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="absolute inset-0 w-full h-full object-cover opacity-55"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#141026] via-[#0B0A12] to-[#07070B]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07070B] via-[#07070B]/65 to-[#07070B]/40" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-300">
            <BookOpenCheck className="w-5 h-5" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight text-white">
            My Study Space
          </span>
        </div>

        <div className="relative z-10 max-w-xl space-y-6 my-8 lg:my-0">
          <h1
            className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.1]"
            style={{ textWrap: 'balance' }}
          >
            Your private academic control center.
          </h1>
          <p className="text-base text-[#B6B2CC] leading-relaxed max-w-lg">
            Unify weekly study plans, exam marks, timed focus sessions, structured
            subject notes, mistake reviews, flashcards, and your personal PDF library
            inside one calm workspace.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-[#0D0D14]/85 border border-[#242236]">
              <Clock className="w-4 h-4 text-violet-400 mb-2" />
              <div className="text-sm font-semibold text-white">Focus & Pomodoro</div>
              <div className="text-xs text-[#9591AD] mt-1">
                Daily goal tracking by subject
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#0D0D14]/85 border border-[#242236]">
              <BarChart3 className="w-4 h-4 text-violet-400 mb-2" />
              <div className="text-sm font-semibold text-white">Live Analytics</div>
              <div className="text-xs text-[#9591AD] mt-1">
                Auto-computed exam trends
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#0D0D14]/85 border border-[#242236]">
              <Layers className="w-4 h-4 text-violet-400 mb-2" />
              <div className="text-sm font-semibold text-white">Active Recall</div>
              <div className="text-xs text-[#9591AD] mt-1">
                Flashcards & mistake notebook
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-[#807C99] flex items-center gap-2">
          <span>PostgreSQL Cloud Persistence</span>
          <span aria-hidden="true">·</span>
          <span>Encrypted Private Account</span>
        </div>
      </div>

      {/* Right: Sign-In & Registration Card */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16 bg-[#09090E]">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wider uppercase text-violet-400">
              Private Student Access
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Enter your study sanctuary
            </h2>
            <p className="text-sm text-[#9E9BB4] leading-relaxed">
              Sign in or register your personal account to save all notes, marks,
              flashcards, and PDF documents permanently.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#111119] border border-[#242338] space-y-5">
            <button
              type="button"
              onClick={handleLogin}
              disabled={signingIn}
              className="w-full py-3.5 px-5 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-[0.99] text-white font-medium text-sm transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
            >
              <span>{signingIn ? 'Connecting your account...' : 'Sign in or Register with Google'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-4 border-t border-[#1F1E30] flex items-start gap-3 text-xs text-[#8D89A6]">
              <ShieldCheck className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Your data is strictly isolated to your private account and backed by
                persistent PostgreSQL storage across all devices.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
