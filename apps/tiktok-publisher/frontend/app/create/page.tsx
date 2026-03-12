'use client'

import { useAppStore } from '@/lib/store'
import ScriptForm from '@/components/ScriptForm'
import ScriptResult from '@/components/ScriptResult'
import VideoProgress from '@/components/VideoProgress'
import VideoPlayer from '@/components/VideoPlayer'

export default function CreatePage() {
  const { step } = useAppStore()

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-12">
      {step === 'form'       && <ScriptForm />}
      {step === 'script'     && <ScriptResult />}
      {step === 'generating' && <VideoProgress />}
      {step === 'preview'    && <VideoPlayer />}
    </main>
  )
}
