import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, Star, Eye, X, Copy, FileText, Loader2, AlertCircle,
  Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Undo2, Redo2, Palette, EyeOff, Image, Minus, Upload, LayoutGrid,
  FileUp,
} from 'lucide-react'
import { useEditor, EditorContent, Node, mergeAttributes, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import ImageExt from '@tiptap/extension-image'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import {
  fetchDocumentTypes,
  fetchDocumentTemplates,
  fetchPlatformTemplateHtml,
  createDocumentTemplate,
  updateDocumentTemplate,
  deleteDocumentTemplate,
  setDefaultDocumentTemplate,
  previewDocumentHtml,
  fetchOrgBranding,
  type DocumentType,
  type DocumentTemplate,
} from '../../lib/queries/documents'

// ── Editor CSS (injected once into <head>) ────────────────────────────────

const EDITOR_CSS = `
.tiptap-doc-editor .ProseMirror {
  outline: none;
  min-height: 520px;
  padding: 40px 48px;
  font-family: 'Times New Roman', Georgia, serif;
  font-size: 11pt;
  line-height: 1.75;
  color: #1a1a1a;
  caret-color: #0d9488;
}
.tiptap-doc-editor .ProseMirror h1 {
  font-size: 20pt; font-weight: 700; margin: 0 0 14px; line-height: 1.3;
}
.tiptap-doc-editor .ProseMirror h2 {
  font-size: 15pt; font-weight: 700; margin: 0 0 10px; line-height: 1.3;
}
.tiptap-doc-editor .ProseMirror h3 {
  font-size: 12pt; font-weight: 700; margin: 0 0 8px;
}
.tiptap-doc-editor .ProseMirror p { margin: 0 0 10px; }
.tiptap-doc-editor .ProseMirror ul {
  list-style: disc; padding-left: 24px; margin: 0 0 10px;
}
.tiptap-doc-editor .ProseMirror ol {
  list-style: decimal; padding-left: 24px; margin: 0 0 10px;
}
.tiptap-doc-editor .ProseMirror blockquote {
  border-left: 3px solid #d1d5db; padding-left: 16px; color: #6b7280; margin: 0 0 10px;
}
.tiptap-doc-editor .ProseMirror hr.custom-horizontal-rule {
  border: none;
  border-top: 2px solid #cbd5e1;
  margin: 24px 0;
  cursor: pointer;
  transition: border-color 0.2s;
}
.tiptap-doc-editor .ProseMirror hr.custom-horizontal-rule:hover {
  border-top-color: #0d9488;
}
.tiptap-doc-editor .ProseMirror img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 16px 0;
  border-radius: 4px;
  cursor: pointer;
  transition: outline 0.2s;
}
.tiptap-doc-editor .ProseMirror img.ProseMirror-selectednode {
  outline: 3px solid #0d9488;
  outline-offset: 2px;
}
.tiptap-doc-editor .ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  color: #9ca3af; pointer-events: none; float: left; height: 0;
}
.tiptap-doc-editor .ProseMirror .ProseMirror-selectednode {
  outline: 2px solid #0d9488; border-radius: 3px;
}
.tiptap-variable-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  background: #f0fdfa;
  border: 1px solid #5eead4;
  color: #0f766e;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.78em;
  font-weight: 600;
  white-space: nowrap;
  cursor: default;
  user-select: none;
  vertical-align: baseline;
  line-height: 1.6;
}
/* Drag and drop overlay */
.tiptap-doc-editor.drag-over {
  background: rgba(13, 148, 136, 0.05);
}
.tiptap-doc-editor .drop-zone-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 10;
}
.tiptap-doc-editor.drag-over .drop-zone-overlay {
  opacity: 1;
}

/* Custom scrollbar for sidebar */
.sidebar-scroll::-webkit-scrollbar {
  width: 10px;
}
.sidebar-scroll::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 5px;
}
.sidebar-scroll::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 5px;
  border: 2px solid #f1f5f9;
}
.sidebar-scroll::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
/* Firefox scrollbar */
.sidebar-scroll {
  scrollbar-width: auto;
  scrollbar-color: #cbd5e1 #f1f5f9;
}
`

function useInjectEditorCss() {
  useEffect(() => {
    const id = 'tiptap-doc-editor-css'
    if (!document.getElementById(id)) {
      const el = document.createElement('style')
      el.id = id
      el.textContent = EDITOR_CSS
      document.head.appendChild(el)
    }
  }, [])
}

// ── Custom variable inline node ────────────────────────────────────────────

const VariableNode = Node.create({
  name: 'templateVariable',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return { varName: { default: '' } }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-variable]',
        getAttrs: (dom) => ({
          varName: (dom as HTMLElement).getAttribute('data-variable') ?? '',
        }),
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-variable': node.attrs.varName,
        class: 'tiptap-variable-badge',
        contenteditable: 'false',
      }),
      `{{${node.attrs.varName}}}`,
    ]
  },
})

// ── HTML round-trip helpers ────────────────────────────────────────────────

/**
 * Prepare stored HTML for the Tiptap editor.
 * {{VAR}} → <span data-variable="VAR">{{VAR}}</span>
 * so the custom node is parsed correctly.
 */
function toEditorHtml(raw: string): string {
  return raw.replace(
    /\{\{([A-Z0-9_]+)\}\}/g,
    '<span data-variable="$1">{{$1}}</span>',
  )
}

/**
 * Convert editor HTML back to clean {{VAR}} tokens before saving to backend.
 * Strips the <span data-variable> wrapper so the Rust replace() still works.
 */
function fromEditorHtml(html: string): string {
  return html.replace(
    /<span[^>]*data-variable="([^"]+)"[^>]*>[^<]*<\/span>/g,
    '{{$1}}',
  )
}

/**
 * Wrap body HTML in a full document for the live browser preview iframe.
 * Mirrors the print CSS used by the Chromium PDF generator.
 * Replaces {{ORG_*}} and {{DATE_*}} variables with dummy/actual org data.
 */
function wrapForBrowserPreview(bodyHtml: string, orgLogo?: string | null, orgName?: string): string {
  // Use actual org data if available, otherwise use dummy data
  const orgData = {
    ORG_NAME: orgName || 'Greenwood International School',
    ORG_LOGO: orgLogo || '',
    ORG_ADDRESS: '123 Education Lane, Knowledge Park, New Delhi – 110001',
    ORG_PHONE: '+91 98765 43210',
    ORG_EMAIL: 'info@greenwoodschool.edu',
    ORG_WEBSITE: 'www.greenwoodschool.edu',
    DATE_TODAY: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
    DATE_ADMISSION: '15 April 2025',
    DATE_BIRTH: '12 March 2010',
    DATE_JOINING: '01 June 2023',
  }

  // Replace variables in the HTML
  let processedHtml = bodyHtml
  for (const [key, value] of Object.entries(orgData)) {
    if (value) {
      processedHtml = processedHtml.replace(
        new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
        key === 'ORG_LOGO' && value
          ? `<img src="${value}" alt="Org Logo" style="max-width:120px;max-height:60px;object-fit:contain;" />`
          : value
      )
    }
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  *{box-sizing:border-box}
  body{font-family:'Times New Roman',Georgia,serif;font-size:11pt;line-height:1.75;
       color:#1a1a1a;background:#fff;padding:32px 48px;max-width:794px;margin:0 auto}
  h1{font-size:20pt;font-weight:700;margin:0 0 14px}
  h2{font-size:15pt;font-weight:700;margin:0 0 10px}
  h3{font-size:12pt;font-weight:700;margin:0 0 8px}
  p{margin:0 0 10px}
  ul{list-style:disc;padding-left:24px;margin:0 0 10px}
  ol{list-style:decimal;padding-left:24px;margin:0 0 10px}
  .tiptap-variable-badge{
    display:inline;background:#fef3c7;border:1px solid #fcd34d;color:#92400e;
    padding:0 5px;border-radius:3px;font-family:monospace;font-size:.85em;font-weight:600
  }
  img{max-width:100%;height:auto}
</style>
</head><body>${processedHtml}</body></html>`
}

// ── Misc helpers ───────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return iso }
}

/** "STUDENT_NAME" → "Student Name" */
function varLabel(v: string): string {
  return v.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

/** Group variables by prefix (STUDENT_, STAFF_, SCHOOL_, DATE_, etc.) */
function groupVars(vars: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {}
  for (const v of vars) {
    const prefix = v.includes('_') ? v.split('_')[0] : 'OTHER'
    ;(groups[prefix] ??= []).push(v)
  }
  return groups
}

// ── Toolbar ────────────────────────────────────────────────────────────────

function TbBtn({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active ? 'bg-teal-100 text-teal-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <div className="w-px h-5 bg-gray-200 self-center mx-0.5 flex-shrink-0" />
}

const COLOR_SWATCHES = [
  { hex: '#000000', name: 'Black' },
  { hex: '#374151', name: 'Dark Gray' },
  { hex: '#1d4ed8', name: 'Blue' },
  { hex: '#0d9488', name: 'Teal' },
  { hex: '#dc2626', name: 'Red' },
  { hex: '#d97706', name: 'Amber' },
  { hex: '#7c3aed', name: 'Purple' },
  { hex: '#be185d', name: 'Pink' },
  { hex: '#065f46', name: 'Dark Green' },
  { hex: '#92400e', name: 'Brown' },
]

function EditorToolbar({ editor }: { editor: Editor | null }) {
  const [showColors, setShowColors] = useState(false)
  const colorRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colorRef.current && !colorRef.current.contains(e.target as HTMLElement)) {
        setShowColors(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!editor) return null

  const headingLevel = editor.isActive('heading', { level: 1 }) ? '1'
    : editor.isActive('heading', { level: 2 }) ? '2'
    : editor.isActive('heading', { level: 3 }) ? '3'
    : '0'

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        editor.chain().focus().setImage({ src: result }).run()
      }
      reader.readAsDataURL(file)
    }
    if (e.target) e.target.value = ''
  }

  const handleInsertLine = () => {
    editor.chain().focus().setHorizontalRule().run()
  }

  return (
    <div className="flex items-center flex-wrap gap-0.5 px-3 py-2 border-b border-gray-200 bg-gray-50/80 flex-shrink-0 sticky top-0 z-10">
      {/* Undo / Redo */}
      <TbBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (Ctrl+Z)">
        <Undo2 className="w-4 h-4" />
      </TbBtn>
      <TbBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (Ctrl+Y)">
        <Redo2 className="w-4 h-4" />
      </TbBtn>
      <Sep />

      {/* Block style */}
      <select
        value={headingLevel}
        onMouseDown={e => e.stopPropagation()}
        onChange={e => {
          const v = e.target.value
          if (v === '0') editor.chain().focus().setParagraph().run()
          else editor.chain().focus().setHeading({ level: parseInt(v) as 1 | 2 | 3 }).run()
        }}
        className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-700 h-7 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
      >
        <option value="0">Normal text</option>
        <option value="1">Heading 1 (large)</option>
        <option value="2">Heading 2 (medium)</option>
        <option value="3">Heading 3 (small)</option>
      </select>
      <Sep />

      {/* Inline formatting */}
      <TbBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)">
        <Bold className="w-4 h-4" />
      </TbBtn>
      <TbBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)">
        <Italic className="w-4 h-4" />
      </TbBtn>
      <TbBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Ctrl+U)">
        <UnderlineIcon className="w-4 h-4" />
      </TbBtn>
      <Sep />

      {/* Alignment */}
      <TbBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align left">
        <AlignLeft className="w-4 h-4" />
      </TbBtn>
      <TbBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Centre">
        <AlignCenter className="w-4 h-4" />
      </TbBtn>
      <TbBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align right">
        <AlignRight className="w-4 h-4" />
      </TbBtn>
      <Sep />

      {/* Lists */}
      <TbBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
        <List className="w-4 h-4" />
      </TbBtn>
      <TbBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">
        <ListOrdered className="w-4 h-4" />
      </TbBtn>
      <Sep />

      {/* Insert elements */}
      <TbBtn onClick={handleInsertLine} title="Insert horizontal line">
        <Minus className="w-4 h-4" />
      </TbBtn>
      <TbBtn onClick={() => imageInputRef.current?.click()} title="Insert image">
        <Image className="w-4 h-4" />
      </TbBtn>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelect}
      />
      <Sep />

      {/* Colour picker */}
      <div className="relative" ref={colorRef}>
        <TbBtn onClick={() => setShowColors(v => !v)} active={showColors} title="Text colour">
          <Palette className="w-4 h-4" />
        </TbBtn>
        {showColors && (
          <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-48">
            <p className="text-xs font-medium text-gray-500 mb-2">Text colour</p>
            <div className="grid grid-cols-5 gap-1.5 mb-2">
              {COLOR_SWATCHES.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  title={c.name}
                  onMouseDown={e => {
                    e.preventDefault()
                    editor.chain().focus().setColor(c.hex).run()
                    setShowColors(false)
                  }}
                  className="w-7 h-7 rounded border-2 border-white hover:scale-110 transition-transform shadow-sm"
                  style={{ backgroundColor: c.hex, boxShadow: '0 0 0 1px #e5e7eb' }}
                />
              ))}
            </div>
            <button
              type="button"
              onMouseDown={e => {
                e.preventDefault()
                editor.chain().focus().unsetColor().run()
                setShowColors(false)
              }}
              className="w-full text-xs text-gray-500 hover:text-gray-700 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset to default
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Template editor modal ──────────────────────────────────────────────────

interface EditorProps {
  docType: DocumentType
  initial?: DocumentTemplate | null
  initialHtml?: string
  onClose: () => void
  onSaved: () => void
}

function TemplateEditor({ docType, initial, initialHtml, onClose, onSaved }: EditorProps) {
  useInjectEditorCss()
  const queryClient = useQueryClient()

  const [name, setName]               = useState(initial?.name        ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [isDefault, setIsDefault]     = useState(initial?.isDefault   ?? false)
  const [showPreview, setShowPreview] = useState(false)
  const [pdfLoading, setPdfLoading]   = useState(false)
  const [pdfError, setPdfError]       = useState<string | null>(null)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const previewIframeRef              = useRef<HTMLIFrameElement>(null)
  const importFileRef               = useRef<HTMLInputElement>(null)

  // Fetch org branding for preview
  const { data: orgBranding } = useQuery({
    queryKey: ['orgBranding'],
    queryFn: fetchOrgBranding,
    staleTime: 10 * 60_000,
  })

  const rawHtml = initial?.htmlContent ?? initialHtml ?? ''

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ 
        codeBlock: false,
        horizontalRule: false, // We'll use our own configuration
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Underline,
      Placeholder.configure({ placeholder: 'Start typing your document here. Use the panel on the right to insert student or staff information.' }),
      VariableNode,
      ImageExt.configure({
        inline: false,
        allowBase64: true,
      }),
      HorizontalRule.configure({
        HTMLAttributes: {
          class: 'custom-horizontal-rule',
        },
      }),
    ],
    content: toEditorHtml(rawHtml),
    editorProps: {
      handleDrop: (view, event, _slice, moved) => {
        // Handle image drop
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0]
          if (file.type.startsWith('image/')) {
            const reader = new FileReader()
            reader.onload = (e) => {
              const result = e.target?.result as string
              const { schema } = view.state
              const node = schema.nodes.image?.create({ src: result })
              if (node) {
                const eventPos = view.posAtCoords({ left: event.clientX, top: event.clientY })
                if (eventPos) {
                  const transaction = view.state.tr.insert(eventPos.pos, node)
                  view.dispatch(transaction)
                }
              }
            }
            reader.readAsDataURL(file)
            return true
          }
        }
        return false
      },
    },
  })

  // Write into preview iframe whenever it's shown
  const refreshPreview = useCallback(() => {
    if (!editor || !previewIframeRef.current) return
    const html = fromEditorHtml(editor.getHTML())
    const doc = previewIframeRef.current.contentDocument
      ?? previewIframeRef.current.contentWindow?.document
    if (doc) {
      doc.open()
      doc.write(wrapForBrowserPreview(html, orgBranding?.logoUrl, orgBranding?.name))
      doc.close()
    }
  }, [editor, orgBranding])

  useEffect(() => {
    if (showPreview) refreshPreview()
  }, [showPreview, refreshPreview])

  // Live refresh while preview pane is open
  useEffect(() => {
    if (!editor || !showPreview) return
    editor.on('update', refreshPreview)
    return () => { editor.off('update', refreshPreview) }
  }, [editor, showPreview, refreshPreview])

  const insertVar = useCallback((varName: string) => {
    if (!editor) return
    editor.chain().focus().insertContent({ type: 'templateVariable', attrs: { varName } }).run()
  }, [editor])

  const handlePdfPreview = async () => {
    if (!editor) return
    const html = fromEditorHtml(editor.getHTML())
    setPdfLoading(true)
    setPdfError(null)
    try {
      const url = await previewDocumentHtml(html)
      window.open(url, '_blank')
    } catch (e: any) {
      setPdfError(e.message || 'PDF generation failed')
    } finally {
      setPdfLoading(false)
    }
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return

    setImportLoading(true)
    setImportError(null)

    try {
      const fileName = file.name.toLowerCase()
      let htmlContent = ''

      if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
        // HTML file - read directly
        htmlContent = await file.text()
      } else if (fileName.endsWith('.txt')) {
        // Text file - convert to HTML paragraphs
        const text = await file.text()
        htmlContent = text
          .split('\n\n')
          .filter(p => p.trim())
          .map(p => `<p>${p.trim()}</p>`)
          .join('')
      } else if (fileName.endsWith('.docx')) {
        // DOCX - show message that it's not supported yet
        setImportError('DOCX import is not supported yet. Please save your document as HTML or TXT format.')
        setImportLoading(false)
        if (importFileRef.current) importFileRef.current.value = ''
        return
      } else if (fileName.endsWith('.pdf')) {
        // PDF - show message that it's not supported
        setImportError('PDF import is not supported yet. Please convert your PDF to HTML or TXT format first.')
        setImportLoading(false)
        if (importFileRef.current) importFileRef.current.value = ''
        return
      } else {
        setImportError('Unsupported file format. Please use HTML, TXT, DOCX, or PDF files.')
        setImportLoading(false)
        if (importFileRef.current) importFileRef.current.value = ''
        return
      }

      // Clean up HTML and insert into editor
      if (htmlContent) {
        // Remove script tags, style tags, and clean up
        htmlContent = htmlContent
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<head[\s\S]*?<\/head>/gi, '')
          .replace(/<html[^>]*>|<\/html>/gi, '')
          .replace(/<body[^>]*>|<\/body>/gi, '')

        // Insert at cursor position
        editor.chain().focus().insertContent(htmlContent).run()
      }
    } catch (err: any) {
      setImportError(err.message || 'Failed to import file')
    } finally {
      setImportLoading(false)
      if (importFileRef.current) importFileRef.current.value = ''
    }
  }

  const handleSave = async () => {
    if (!editor) return
    const html = fromEditorHtml(editor.getHTML())
    if (!name.trim()) { setError('Please enter a template name.'); return }
    if (!html.trim() || html === '<p></p>') { setError('Template content cannot be empty.'); return }
    setSaving(true); setError(null)
    try {
      if (initial) {
        await updateDocumentTemplate(initial.id, { name, description, htmlContent: html, isDefault })
      } else {
        await createDocumentTemplate({ documentType: docType.code, name, description, htmlContent: html, isDefault })
      }
      queryClient.invalidateQueries({ queryKey: ['documentTemplates', docType.code] })
      onSaved()
    } catch (e: any) {
      setError(e.message || 'Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const varGroups = groupVars(docType.availableVars)

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-200 bg-white flex-shrink-0">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {initial ? 'Edit Template' : 'New Template'}
            <span className="text-gray-400 font-normal"> — {docType.name}</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">
            Format the document below. Use the right panel to insert data fields.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Import button */}
          <button
            type="button"
            onClick={() => {
              setImportError(null)
              importFileRef.current?.click()
            }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            title="Import template from file"
          >
            <FileUp className="w-4 h-4" />
            Import
          </button>
          <input
            ref={importFileRef}
            type="file"
            accept=".html,.htm,.txt,.docx,.pdf"
            className="hidden"
            onChange={handleImportFile}
          />
          <button
            type="button"
            onClick={() => setShowPreview(v => !v)}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
              showPreview
                ? 'bg-teal-600 text-white border-teal-600 hover:bg-teal-700'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {showPreview ? <><EyeOff className="w-4 h-4" /> Back to edit</> : <><Eye className="w-4 h-4" /> Preview</>}
          </button>
          <button
            type="button"
            onClick={handlePdfPreview}
            disabled={pdfLoading}
            title="Generate a real PDF preview (opens in new tab)"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            PDF preview
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Meta row ── */}
      <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap gap-3 items-end bg-gray-50/50 flex-shrink-0">
        <div className="flex-1 min-w-40">
          <label className="block text-xs font-medium text-gray-600 mb-1">Template name *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            placeholder="e.g. Standard Offer Letter"
          />
        </div>
        <div className="flex-1 min-w-40">
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            placeholder="Optional note about this template"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none h-9 mb-px">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={e => setIsDefault(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-sm text-gray-700">Use as default</span>
        </label>
      </div>

      {/* ── Body: editor + sidebar ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Editor / Preview area */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {!showPreview && <EditorToolbar editor={editor} />}
          <div className="flex-1 overflow-y-auto bg-gray-100/60">
            {showPreview ? (
              <iframe
                ref={previewIframeRef}
                sandbox="allow-same-origin"
                className="w-full h-full border-0 bg-white"
                title="Document preview"
              />
            ) : (
              <div className="py-6 px-4">
                {/* Paper shadow effect */}
                <div 
                  className="max-w-3xl mx-auto bg-white shadow-md rounded border border-gray-200 tiptap-doc-editor relative"
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.currentTarget.classList.add('drag-over')
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('drag-over')
                  }}
                  onDrop={(e) => {
                    e.currentTarget.classList.remove('drag-over')
                  }}
                >
                  {/* Drop zone overlay */}
                  <div className="absolute inset-0 pointer-events-none opacity-0 drag-over:opacity-100 transition-opacity z-10">
                    <div className="absolute inset-0 border-4 border-dashed border-teal-500 rounded-lg m-4"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-teal-500 text-white px-6 py-3 rounded-lg shadow-lg">
                        <div className="flex items-center gap-2">
                          <Image className="w-5 h-5" />
                          <span className="text-sm font-medium">Drop image here</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <EditorContent editor={editor} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Variables sidebar — hidden when preview is active */}
        {!showPreview && (
          <aside className="w-72 flex-shrink-0 border-l border-gray-200 flex flex-col bg-white overflow-hidden">
            {/* Header - Fixed */}
            <div className="px-4 py-3 border-b border-gray-100 bg-blue-50/40 flex-shrink-0">
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                Design Tools
              </p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Click to insert elements or drag & drop images into the editor.
              </p>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto sidebar-scroll">
              {/* Design Tools Buttons */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().setHorizontalRule().run()}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-gray-200 hover:border-teal-500 hover:bg-teal-50 transition-colors group"
                    title="Insert horizontal line"
                  >
                    <Minus className="w-5 h-5 text-gray-600 group-hover:text-teal-700" />
                    <span className="text-xs text-gray-700 group-hover:text-teal-800 font-medium">Add Line</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = 'image/*'
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0]
                        if (file && file.type.startsWith('image/')) {
                          const reader = new FileReader()
                          reader.onload = (event) => {
                            const result = event.target?.result as string
                            editor?.chain().focus().setImage({ src: result }).run()
                          }
                          reader.readAsDataURL(file)
                        }
                      }
                      input.click()
                    }}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-gray-200 hover:border-teal-500 hover:bg-teal-50 transition-colors group"
                    title="Insert image from computer"
                  >
                    <Upload className="w-5 h-5 text-gray-600 group-hover:text-teal-700" />
                    <span className="text-xs text-gray-700 group-hover:text-teal-800 font-medium">Upload Image</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().setTextAlign('center').run()}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-gray-200 hover:border-teal-500 hover:bg-teal-50 transition-colors group"
                    title="Center align text"
                  >
                    <AlignCenter className="w-5 h-5 text-gray-600 group-hover:text-teal-700" />
                    <span className="text-xs text-gray-700 group-hover:text-teal-800 font-medium">Center Text</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().setTextAlign('left').run()}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-gray-200 hover:border-teal-500 hover:bg-teal-50 transition-colors group"
                    title="Left align text"
                  >
                    <AlignLeft className="w-5 h-5 text-gray-600 group-hover:text-teal-700" />
                    <span className="text-xs text-gray-700 group-hover:text-teal-800 font-medium">Left Text</span>
                  </button>
                </div>

                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800 font-medium mb-1">💡 Quick Tip</p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Drag and drop images directly into the editor, or use the Upload Image button above.
                  </p>
                </div>
              </div>

              {/* Affiliated Logos Section */}
              <div className="px-4 py-3 border-b border-gray-100 bg-purple-50/40">
                <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Affiliated Logos
                </p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Click to insert organization or partner logos. The main org logo appears automatically if set in Settings.
                </p>
              </div>

              <div className="px-4 py-3">
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (orgBranding?.logoUrl) {
                        editor?.chain().focus().setImage({ src: orgBranding.logoUrl }).run()
                      } else {
                        // Insert placeholder if no logo uploaded
                        editor?.chain().focus().insertContent(`
                          <div style="text-align: center; padding: 20px; background: #f9fafb; border: 2px dashed #d1d5db; border-radius: 8px;">
                            <p style="color: #6b7280; font-size: 12px; margin: 0;">Organization Logo</p>
                            <p style="color: #9ca3af; font-size: 10px; margin: 4px 0 0 0;">Upload in Settings → Organisation</p>
                          </div>
                        `).run()
                      }
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-purple-200 hover:border-purple-500 hover:bg-purple-50 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white border border-purple-200 flex items-center justify-center overflow-hidden">
                      {orgBranding?.logoUrl ? (
                        <img src={orgBranding.logoUrl} alt="Org Logo" className="w-full h-full object-contain" />
                      ) : (
                        <Image className="w-5 h-5 text-purple-400" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm text-gray-700 group-hover:text-purple-800 font-medium">
                        {orgBranding?.name || 'Organization Logo'}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {orgBranding?.logoUrl ? 'Click to insert' : 'Not uploaded yet'}
                      </p>
                    </div>
                  </button>

                  {/* Partner logos - placeholders for affiliated institutions */}
                  {[1, 2].map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        const input = document.createElement('input')
                        input.type = 'file'
                        input.accept = 'image/*'
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0]
                          if (file && file.type.startsWith('image/')) {
                            const reader = new FileReader()
                            reader.onload = (event) => {
                              const result = event.target?.result as string
                              editor?.chain().focus().setImage({ src: result }).run()
                            }
                            reader.readAsDataURL(file)
                          }
                        }
                        input.click()
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center">
                        <Image className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm text-gray-700 group-hover:text-purple-800 font-medium">
                          Partner Logo {i}
                        </p>
                        <p className="text-xs text-gray-400">Click to upload & insert</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Variables Section */}
              <div className="px-4 py-3 border-b border-gray-100 bg-teal-50/40 flex-shrink-0">
                <p className="text-sm font-semibold text-gray-800">Data Fields</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Click any field to insert it at your cursor. When a document is generated, it gets replaced with the real value.
                </p>
              </div>
              <div className="py-3 px-3">
              {Object.entries(varGroups).map(([group, vars]) => (
                <div key={group} className="mb-4">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1.5">
                    {group === 'OTHER' ? 'General' : varLabel(group)}
                  </p>
                  <div className="space-y-0.5">
                    {vars.map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insertVar(v)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-teal-50 hover:text-teal-800 text-left transition-colors group border border-transparent hover:border-teal-100"
                      >
                        <span className="flex-shrink-0 w-7 h-7 rounded-md bg-gray-100 group-hover:bg-teal-100 text-gray-500 group-hover:text-teal-700 flex items-center justify-center text-xs font-bold transition-colors">
                          {varLabel(v).charAt(0)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm text-gray-700 group-hover:text-teal-800 font-medium truncate leading-tight">
                            {varLabel(v)}
                          </p>
                          <p className="text-[10px] text-gray-400 font-mono truncate leading-tight">
                            {`{{${v}}}`}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-200 bg-gray-50/60 flex-shrink-0">
        <div className="flex-1">
          {(pdfError || error || importError) && (
            <p className="text-sm text-red-600 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {pdfError || error || importError}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving…' : initial ? 'Save Changes' : 'Create Template'}
          </button>
        </div>
      </div>

      {/* Import loading overlay */}
      {importLoading && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-6 flex items-center gap-4">
            <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">Importing template...</p>
              <p className="text-xs text-gray-500 mt-1">Please wait while we process your file</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Template card ─────────────────────────────────────────────────────────

interface CardProps {
  template: DocumentTemplate
  onEdit: () => void
  onDelete: () => void
  onSetDefault: () => void
  isSettingDefault: boolean
}

function TemplateCard({ template, onEdit, onDelete, onSetDefault, isSettingDefault }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border transition-shadow hover:shadow-md overflow-hidden ${template.isDefault ? 'border-teal-400 ring-1 ring-teal-200' : 'border-gray-200'}`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 truncate text-sm">{template.name}</h3>
              {template.isDefault && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
                  <Star className="w-3 h-3" /> Default
                </span>
              )}
            </div>
            {template.description && (
              <p className="text-xs text-gray-500 mt-1 truncate">{template.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-2">Updated {fmtDate(template.updatedAt)}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 px-5 py-3 bg-gray-50/60 border-t border-gray-100">
        {!template.isDefault && (
          <button
            onClick={onSetDefault}
            disabled={isSettingDefault}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-gray-600 border border-gray-200 bg-white hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 transition-colors disabled:opacity-50"
          >
            {isSettingDefault ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />}
            Set default
          </button>
        )}
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 transition-colors ml-auto"
        >
          <Pencil className="w-3 h-3" /> Edit
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-red-600 border border-red-100 bg-white hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-3 h-3" /> Delete
        </button>
      </div>
    </div>
  )
}

// ── Platform default card ──────────────────────────────────────────────────

function PlatformCard({ docType, onCreate }: { docType: DocumentType; onCreate: (html: string) => void }) {
  const [loading, setLoading] = useState(false)

  const handleUseAsBase = async () => {
    setLoading(true)
    try {
      const html = await fetchPlatformTemplateHtml(docType.code)
      onCreate(html)
    } catch (e: any) {
      alert(e.message || 'Failed to load platform template')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 border-dashed p-5">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-medium text-gray-600">Platform Default</h3>
      </div>
      <p className="text-xs text-gray-400 mb-4 leading-relaxed">
        Built-in template provided by Varalabs. Customise it to add your school's branding, logo, and contact details.
      </p>
      <button
        onClick={handleUseAsBase}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-teal-700 border border-teal-200 bg-teal-50 hover:bg-teal-100 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
        {loading ? 'Loading…' : 'Customise this template'}
      </button>
    </div>
  )
}

// ── Delete confirm modal ───────────────────────────────────────────────────

function DeleteModal({
  template, onConfirm, onCancel, deleting,
}: {
  template: DocumentTemplate; onConfirm: () => void; onCancel: () => void; deleting: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Delete template?</h3>
            <p className="text-sm text-gray-500">"{template.name}"</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          This cannot be undone. Documents already generated using this template are not affected.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function DocumentTemplates() {
  const queryClient = useQueryClient()

  const [activeTypeCode, setActiveTypeCode] = useState<string | null>(null)
  const [editorState, setEditorState] = useState<{
    open: boolean; template: DocumentTemplate | null; prefillHtml: string
  }>({ open: false, template: null, prefillHtml: '' })
  const [deleteTarget, setDeleteTarget]         = useState<DocumentTemplate | null>(null)
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null)

  const { data: docTypes = [], isLoading: typesLoading } = useQuery({
    queryKey: ['documentTypes'],
    queryFn: fetchDocumentTypes,
    staleTime: Infinity,
  })

  const activeType = docTypes.find(t => t.code === activeTypeCode) ?? docTypes[0] ?? null

  useEffect(() => {
    if (docTypes.length > 0 && !activeTypeCode) setActiveTypeCode(docTypes[0].code)
  }, [docTypes, activeTypeCode])

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['documentTemplates', activeType?.code],
    queryFn: () => fetchDocumentTemplates(activeType!.code),
    enabled: !!activeType,
    staleTime: 30_000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDocumentTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentTemplates', activeType?.code] })
      setDeleteTarget(null)
    },
  })

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => setDefaultDocumentTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentTemplates', activeType?.code] })
      setSettingDefaultId(null)
    },
    onError: () => setSettingDefaultId(null),
  })

  const openNew  = (prefillHtml = '') => setEditorState({ open: true, template: null, prefillHtml })
  const openEdit = (t: DocumentTemplate) => setEditorState({ open: true, template: t, prefillHtml: '' })
  const closeEditor = () => setEditorState({ open: false, template: null, prefillHtml: '' })

  if (typesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
        <span className="ml-3 text-gray-500">Loading document types…</span>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Templates</h1>
          <p className="text-sm text-gray-500 mt-1">
            Customise the templates used when generating documents for staff and students.
          </p>
        </div>
        {activeType && (
          <button
            onClick={() => openNew()}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Template
          </button>
        )}
      </div>

      {/* Document type tabs */}
      <div className="flex gap-1 flex-wrap mb-6 bg-gray-100 p-1 rounded-xl">
        {docTypes.map(dt => (
          <button
            key={dt.code}
            onClick={() => setActiveTypeCode(dt.code)}
            className={`flex-1 min-w-fit px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeType?.code === dt.code
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {dt.name}
          </button>
        ))}
      </div>

      {/* Active type info */}
      {activeType && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <p className="text-sm font-medium text-blue-900">{activeType.name}</p>
          <p className="text-xs text-blue-600 mt-0.5">{activeType.description}</p>
          <p className="text-xs text-blue-400 mt-1">Page: {activeType.pageSize} · {activeType.orientation}</p>
        </div>
      )}

      {/* Template grid */}
      {templatesLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
          <span className="ml-2 text-gray-400 text-sm">Loading templates…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeType && (
            <PlatformCard docType={activeType} onCreate={(html) => openNew(html)} />
          )}
          {templates.map(tmpl => (
            <TemplateCard
              key={tmpl.id}
              template={tmpl}
              onEdit={() => openEdit(tmpl)}
              onDelete={() => setDeleteTarget(tmpl)}
              onSetDefault={() => { setSettingDefaultId(tmpl.id); setDefaultMutation.mutate(tmpl.id) }}
              isSettingDefault={settingDefaultId === tmpl.id}
            />
          ))}
          {templates.length === 0 && (
            <div className="sm:col-span-2 lg:col-span-2 flex flex-col items-center justify-center py-10 border border-dashed border-gray-200 rounded-xl text-center">
              <FileText className="w-8 h-8 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500 font-medium">No custom templates yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Click "Customise this template" to get started with the platform default.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Editor modal */}
      {editorState.open && activeType && (
        <TemplateEditor
          docType={activeType}
          initial={editorState.template}
          initialHtml={editorState.prefillHtml}
          onClose={closeEditor}
          onSaved={closeEditor}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <DeleteModal
          template={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          deleting={deleteMutation.isPending}
        />
      )}
    </div>
  )
}
