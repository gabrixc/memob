// src/app/(editor)/EditorClient.tsx
'use client'
import TopBar from '@/components/editor/TopBar'
import StatusBar from '@/components/editor/StatusBar'

export default function EditorClient() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar
        templateName="Untitled Memo"
        onSave={() => {}}
        onPreview={() => {}}
        onExport={() => {}}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-14 bg-slate-50 border-r border-slate-200 shrink-0" />
        <div className="flex-1 bg-slate-500 flex items-center justify-center text-white text-sm">
          Canvas
        </div>
        <div className="w-52 bg-slate-50 border-l border-slate-200 shrink-0" />
      </div>
      <StatusBar
        page={1} totalPages={1} zoom={100}
        objectCount={0} selectedCount={0}
        gridSize={8} snapEnabled={true}
      />
    </div>
  )
}
