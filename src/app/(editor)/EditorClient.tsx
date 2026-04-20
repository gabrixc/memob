'use client'
import { useRef, useState } from 'react'
import { type Canvas as FabricCanvas, type FabricObject } from 'fabric'
import TopBar from '@/components/editor/TopBar'
import StatusBar from '@/components/editor/StatusBar'
import Canvas from '@/components/editor/Canvas'

export default function EditorClient() {
  const fabricRef = useRef<FabricCanvas | null>(null)
  const [selectedObjs, setSelectedObjs] = useState<FabricObject[]>([])

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
        <Canvas
          canvasRef={fabricRef}
          onSelectionChange={setSelectedObjs}
        />
        <div className="w-52 bg-slate-50 border-l border-slate-200 shrink-0" />
      </div>
      <StatusBar
        page={1} totalPages={1} zoom={100}
        objectCount={0} selectedCount={selectedObjs.length}
        gridSize={8} snapEnabled={true}
      />
    </div>
  )
}
