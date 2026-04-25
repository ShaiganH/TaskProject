import { useState, useRef } from 'react'
import { Download, Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useTask } from '../context/TaskContext'
import { exportTasks as exportTasksAPI, importTasks as importTasksAPI } from '../api/TaskService'
import { downloadFile } from '../utils/helpers'
import toast from 'react-hot-toast'

const CSV_TEMPLATE = `Title,Description,Priority,Status,DueDate,Category,AssignedToEmail
Fix login bug,Reproduce on Chrome then fix,High,Todo,2026-05-01,Bug fix,
Write tests,Cover TaskService methods,Medium,Todo,2026-05-10,Research,`

function ImportPreview({ rows }) {
  const valid   = rows.filter(r => r.valid)
  const invalid = rows.filter(r => !r.valid)
  return (
    <div>
      <div className="flex gap-2 mb-3 flex-wrap">
        {valid.length > 0 && <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full"><CheckCircle2 size={11} /> {valid.length} ready</span>}
        {invalid.length > 0 && <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2.5 py-1 rounded-full"><AlertCircle size={11} /> {invalid.length} error{invalid.length > 1 ? 's' : ''}</span>}
      </div>
      <div className="card overflow-hidden">
        <table className="data-table w-full text-xs" style={{ tableLayout: 'fixed' }}>
          <thead><tr><th style={{width:'32%'}}>Title</th><th style={{width:'14%'}}>Priority</th><th style={{width:'14%'}}>Status</th><th style={{width:'14%'}}>Due</th><th style={{width:'26%'}}>Issue</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={`!cursor-default ${!r.valid ? '!bg-red-50' : ''}`}>
                <td className={`truncate ${!r.valid ? 'text-red-500 font-medium' : ''}`}>{r.title || '— missing —'}</td>
                <td>{r.priority || '—'}</td>
                <td>{r.status || '—'}</td>
                <td>{r.dueDate || '—'}</td>
                <td className="text-red-500 text-[10px]">{r.error || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function ExportImportPage() {
  const { tasks } = useTask()
  const [exportFmt,  setExportFmt]  = useState('csv')
  const [importing,  setImporting]  = useState(false)
  const [preview,    setPreview]    = useState(null)
  const [fileName,   setFileName]   = useState('')
  const [importResult, setImportResult] = useState(null)
  const fileRef = useRef()

  const myTasks = tasks.slice(0, 3)  // preview only

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      const res = await exportTasksAPI({ format: exportFmt })
      const url  = URL.createObjectURL(res.data)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `tasks-${new Date().toISOString().slice(0, 10)}.${exportFmt}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported as ${exportFmt.toUpperCase()}`)
    } catch {
      toast.error('Export failed')
    }
  }

  // ── Client-side CSV preview (validate before sending to backend) ──────────
  const parseCSVPreview = (text) => {
    const lines   = text.trim().split('\n')
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    return lines.slice(1).map(line => {
      const vals = line.split(',')
      const obj  = {}
      headers.forEach((h, i) => { obj[h] = (vals[i] ?? '').replace(/^"|"$/g, '').trim() })
      const valid = !!obj.title && !!obj.priority && !!obj.status
      const error = !obj.title ? 'Title required'
        : !obj.priority ? 'Priority required'
        : !obj.status ? 'Status required'
        : ''
      return { ...obj, valid, error }
    })
  }

  const handleFile = (file) => {
    if (!file) return
    setFileName(file.name)
    setImportResult(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const rows = parseCSVPreview(e.target.result)
      if (!rows.length) { toast.error('Empty or invalid file'); return }
      setPreview(rows)
    }
    reader.readAsText(file)
  }

  // ── Import — send raw file to backend which validates every row ───────────
  const handleImport = async () => {
    const file = fileRef.current?.files[0]
    if (!file) { toast.error('Select a file first'); return }
    setImporting(true)
    try {
      const res = await importTasksAPI(file)
      const { imported, failed, errors } = res.data
      setImportResult(res.data)
      if (failed > 0) {
        toast.error(`${imported} imported, ${failed} failed`)
      } else {
        toast.success(`${imported} tasks imported!`)
        setPreview(null); setFileName('')
      }
    } catch (e) {
      toast.error(e?.response?.data?.message ?? 'Import failed')
    } finally { setImporting(false) }
  }

  const FmtToggle = ({ value, onChange }) => (
    <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
      {['csv'].map(f => (
        <button key={f} onClick={() => onChange(f)}
          className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${value === f ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >{f.toUpperCase()}</button>
      ))}
    </div>
  )

  return (
    <div className="page-enter">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Export / Import</h1>
        <p className="text-sm text-gray-400 mt-0.5">Back up your tasks or bring in data from another source</p>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Export */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center"><Download size={18} className="text-green-600" /></div>
            <div><h2 className="text-sm font-semibold text-gray-800">Export my tasks</h2><p className="text-xs text-gray-400">Download as CSV</p></div>
          </div>
          <p className="text-xs text-gray-500 mb-4">Export all your tasks. CSV opens in Excel or Google Sheets.</p>
          <div className="mb-4"><label className="field-label">Format</label><FmtToggle value={exportFmt} onChange={setExportFmt} /></div>
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 mb-4">
            <p className="text-[10px] text-gray-400 mb-2 uppercase tracking-wide">Preview (first 3 rows)</p>
            <table className="w-full text-xs" style={{ tableLayout: 'fixed' }}>
              <thead><tr className="text-gray-400 border-b border-gray-200"><th className="pb-1 text-left font-normal" style={{width:'40%'}}>Title</th><th className="pb-1 text-left font-normal">Status</th><th className="pb-1 text-left font-normal">Priority</th><th className="pb-1 text-left font-normal">Due</th></tr></thead>
              <tbody>
                {tasks.slice(0, 3).map(t => (
                  <tr key={t.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-1 truncate text-gray-700">{t.title}</td>
                    <td className="py-1 text-gray-500">{t.status}</td>
                    <td className="py-1 text-gray-500">{t.priority}</td>
                    <td className="py-1 text-gray-500">{t.dueDate ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="btn-primary w-full justify-center" onClick={handleExport}><Download size={14} /> Download tasks.{exportFmt}</button>
          <p className="text-[10px] text-gray-400 mt-2 text-center">GET /api/tasks/export?format={exportFmt}</p>
        </div>

        {/* Import */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center"><Upload size={18} className="text-brand-600" /></div>
            <div><h2 className="text-sm font-semibold text-gray-800">Import tasks</h2><p className="text-xs text-gray-400">Upload a CSV file</p></div>
          </div>
          <p className="text-xs text-gray-500 mb-4">Each row becomes one task. Backend validates every row before saving.</p>

          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-all mb-4"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
          >
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
            <FileText size={24} className="text-gray-300 mx-auto mb-2" />
            {fileName ? <p className="text-sm font-medium text-brand-600">{fileName}</p> : (
              <><p className="text-sm text-gray-500">Click or drag CSV here</p><p className="text-xs text-gray-400 mt-1">max 10 MB</p></>
            )}
          </div>

          {preview && <div className="mb-4"><ImportPreview rows={preview} /></div>}

          {importResult && (
            <div className={`mb-4 px-3 py-2 rounded-lg text-xs ${importResult.failed > 0 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
              {importResult.imported} imported · {importResult.failed} failed
              {importResult.errors?.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {importResult.errors.map((e, i) => <li key={i}>Row {e.row}: {e.reason}</li>)}
                </ul>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button className="btn-secondary flex-1 justify-center text-xs"
              onClick={() => downloadFile(CSV_TEMPLATE, 'taskflow-template.csv', 'text/csv')}>
              <Download size={13} /> Download template
            </button>
            {preview && preview.some(r => r.valid) && (
              <button className="btn-primary flex-1 justify-center text-xs" onClick={handleImport} disabled={importing}>
                {importing ? 'Importing…' : `Import ${preview.filter(r => r.valid).length} tasks`}
              </button>
            )}
          </div>
          <p className="text-[10px] text-gray-400 mt-2 text-center">POST /api/tasks/import</p>
        </div>
      </div>
    </div>
  )
}
