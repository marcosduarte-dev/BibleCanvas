import React, { useEffect, useState, useRef, useCallback } from 'react';
import { getVersoes, getLivros, getVersiculos, importVersion, deleteVersion } from '../hooks/useDatabase';

export default function BibleReader() {
    const [verses, setVerses] = useState<any[]>([]);
    const [books, setBooks] = useState<any[]>([]);
    const [versions, setVersions] = useState<any[]>([]);
    const [selectedBook, setSelectedBook] = useState<number>(1);
    const [selectedChapter, setSelectedChapter] = useState<number>(1);
    const [selectedVersion, setSelectedVersion] = useState<number>(1);
    const [loading, setLoading] = useState(true);
    const [isImporting, setIsImporting] = useState(false);

    const [isPanelVisible, setIsPanelVisible] = useState(true);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Import form state
    const [importNome, setImportNome] = useState('');
    const [importSigla, setImportSigla] = useState('');
    const [importFile, setImportFile] = useState<File | null>(null);

    const panelRef = useRef<HTMLDivElement>(null);

    // Drag state kept in a ref so it survives across event callbacks without re-renders
    const dragState = useRef<{
        active: boolean;
        pointerId: number;
        startX: number;
        startY: number;
        lastX: number;
        lastY: number;
        text: string;
        ref: string;
        ghost: HTMLElement | null;
        ghostOffsetX: number;
        ghostOffsetY: number;
        sourceRect: DOMRect | null;
    }>({
        active: false,
        pointerId: -1,
        startX: 0, startY: 0,
        lastX: 0, lastY: 0,
        text: '', ref: '',
        ghost: null,
        ghostOffsetX: 0, ghostOffsetY: 0,
        sourceRect: null,
    });

    useEffect(() => {
        async function loadInitial() {
            try {
                const [vData, bData] = await Promise.all([
                    getVersoes(),
                    getLivros()
                ]);
                if (vData.length > 0) {
                    setVersions(vData);
                    setSelectedVersion(vData[0].id);
                }
                if (bData.length > 0) {
                    setBooks(bData);
                    setSelectedBook(bData[0].id);
                }
            } catch (err) {
                console.error('Error loading initial data:', err);
            }
        }
        loadInitial();
    }, [isImporting]); // Reload versions if an import finishes

    useEffect(() => {
        if (!selectedBook || !selectedVersion) return;

        async function loadVerses() {
            setLoading(true);
            try {
                const data = await getVersiculos(selectedVersion, selectedBook, selectedChapter);
                setVerses(data);
            } catch (err) {
                console.error('Error loading verses:', err);
            } finally {
                setLoading(false);
            }
        }

        loadVerses();
    }, [selectedBook, selectedChapter, selectedVersion]);

    // ─── Global pointer handlers attached to document (capture phase) ───
    // Using capture phase + document-level listeners ensures we get the events
    // BEFORE any scrollable container can intercept them for scrolling.

    const onGlobalPointerMove = useCallback((ev: PointerEvent) => {
        const ds = dragState.current;
        if (!ds.active || ev.pointerId !== ds.pointerId) return;

        ds.lastX = ev.clientX;
        ds.lastY = ev.clientY;

        // If ghost doesn't exist yet, check if we moved enough to start dragging
        if (!ds.ghost && ds.sourceRect) {
            const dx = ev.clientX - ds.startX;
            const dy = ev.clientY - ds.startY;
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                // Create ghost element
                const ghost = document.createElement('div');
                ghost.id = 'drag-ghost-verse';
                ghost.textContent = ds.text.length > 80 ? ds.text.substring(0, 80) + '…' : ds.text;
                ghost.style.cssText = `
                    position: fixed;
                    top: 0; left: 0;
                    max-width: ${Math.min(ds.sourceRect.width, 350)}px;
                    padding: 12px 16px;
                    font-family: serif;
                    font-size: 14px;
                    line-height: 1.5;
                    color: #3A3D40;
                    background: #FAF9F6;
                    border: 1px solid #DCD9D0;
                    border-radius: 6px;
                    box-shadow: 0 12px 32px rgba(0,0,0,0.18);
                    opacity: 0.92;
                    pointer-events: none;
                    z-index: 999999;
                    transform: translate(${ev.clientX - ds.ghostOffsetX}px, ${ev.clientY - ds.ghostOffsetY}px);
                    white-space: pre-wrap;
                    word-break: break-word;
                `;
                document.body.appendChild(ghost);
                ds.ghost = ghost;
                document.body.style.cursor = 'grabbing';
            }
        }

        // Move ghost
        if (ds.ghost) {
            ev.preventDefault();
            ev.stopPropagation();
            ds.ghost.style.transform = `translate(${ev.clientX - ds.ghostOffsetX}px, ${ev.clientY - ds.ghostOffsetY}px)`;
        }
    }, []);

    const onGlobalPointerUp = useCallback((ev: PointerEvent) => {
        const ds = dragState.current;
        if (!ds.active || ev.pointerId !== ds.pointerId) return;

        ds.active = false;
        document.body.style.cursor = '';

        // Use last known good coordinates (pen can report 0,0 on up)
        let fx = ev.clientX;
        let fy = ev.clientY;
        if (fx === 0 && fy === 0) {
            fx = ds.lastX;
            fy = ds.lastY;
        }

        const hadGhost = !!ds.ghost;
        if (ds.ghost) {
            ds.ghost.remove();
            ds.ghost = null;
        }

        if (hadGhost) {
            // Check if dropped on canvas (outside the panel)
            let droppedOnCanvas = true;
            const panel = panelRef.current;
            if (panel) {
                const pr = panel.getBoundingClientRect();
                if (fx >= pr.left && fx <= pr.right && fy >= pr.top && fy <= pr.bottom) {
                    droppedOnCanvas = false;
                }
            }
            if (droppedOnCanvas) {
                window.dispatchEvent(new CustomEvent('tldrawDropVerse', {
                    detail: { clientX: fx, clientY: fy, text: ds.text, ref: ds.ref }
                }));
            }
        }

        // Restore panel scroll
        const panel = panelRef.current;
        if (panel) {
            panel.style.overflowY = '';
        }
    }, []);

    // Register and clean up global listeners (capture phase!)
    useEffect(() => {
        document.addEventListener('pointermove', onGlobalPointerMove, { capture: true });
        document.addEventListener('pointerup', onGlobalPointerUp, { capture: true });
        document.addEventListener('pointercancel', onGlobalPointerUp, { capture: true });
        return () => {
            document.removeEventListener('pointermove', onGlobalPointerMove, { capture: true } as EventListenerOptions);
            document.removeEventListener('pointerup', onGlobalPointerUp, { capture: true } as EventListenerOptions);
            document.removeEventListener('pointercancel', onGlobalPointerUp, { capture: true } as EventListenerOptions);
        };
    }, [onGlobalPointerMove, onGlobalPointerUp]);

    // ─── Per-verse pointerdown handler ───
    const handlePointerDown = (e: React.PointerEvent<HTMLElement>, text: string, refStr: string) => {
        if (!e.isPrimary) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        const target = e.currentTarget;
        const rect = target.getBoundingClientRect();

        // Immediately freeze the panel scroll so the browser cannot start a scroll gesture
        const panel = panelRef.current;
        if (panel) {
            panel.style.overflowY = 'hidden';
        }

        dragState.current = {
            active: true,
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            lastX: e.clientX,
            lastY: e.clientY,
            text,
            ref: refStr,
            ghost: null,
            ghostOffsetX: 20,
            ghostOffsetY: 20,
            sourceRect: rect,
        };
    };

    const currentBook = books.find(b => b.id === selectedBook);
    const bookName = currentBook?.nome || "Loading...";

    const handleImportSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!importNome || !importSigla || !importFile) {
            alert("Por favor, preencha todos os campos e selecione um arquivo JSON.");
            return;
        }

        setIsImporting(true);
        try {
            const fileReader = new FileReader();
            fileReader.onload = async (event) => {
                try {
                    const jsonContent = event.target?.result as string;
                    const success = await importVersion(importNome, importSigla, 'pt-br', jsonContent);
                    if (success) {
                        setIsImportModalOpen(false);
                        setImportNome('');
                        setImportSigla('');
                        setImportFile(null);
                        alert("Bíblia importada com sucesso!");
                    } else {
                        alert("Erro ao importar a Bíblia.");
                    }
                } catch (err) {
                    console.error("Error parsing JSON:", err);
                    alert("Arquivo JSON inválido.");
                } finally {
                    setIsImporting(false);
                }
            };
            fileReader.readAsText(importFile);
        } catch (err) {
            console.error("Error reading file:", err);
            setIsImporting(false);
        }
    };

    const handleDeleteVersion = async () => {
        const versionToDelete = versions.find(v => v.id === selectedVersion);
        if (!versionToDelete) return;

        if (confirm(`Tem certeza que deseja deletar a versão "${versionToDelete.nome}"? Esta ação não pode ser desfeita.`)) {
            const success = await deleteVersion(selectedVersion);
            if (success) {
                // Remove from local state
                const updatedVersions = versions.filter(v => v.id !== selectedVersion);
                setVersions(updatedVersions);
                if (updatedVersions.length > 0) {
                    setSelectedVersion(updatedVersions[0].id);
                } else {
                    setSelectedVersion(0);
                    setVerses([]);
                }
                alert("Versão deletada com sucesso.");
            } else {
                alert("Erro ao deletar a versão.");
            }
        }
    };

    if (!isPanelVisible) {
        return (
            <button
                onClick={() => setIsPanelVisible(true)}
                className="absolute top-4 left-4 z-20 bg-white p-3 rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                title="Open Bible Reader"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            </button>
        )
    }

    return (
        <div ref={panelRef} className="absolute left-0 top-0 bottom-0 w-[450px] md:w-[500px] lg:w-[600px] z-10 bg-[#FAF9F6] shadow-2xl border-r border-[#E8E6E1] overflow-y-auto flex flex-col text-[#2C3E50]">

            {/* Top Bar Navigation */}
            <div className="sticky top-0 bg-[#FAF9F6]/95 backdrop-blur-sm z-20 px-8 py-5 flex items-center justify-between border-b border-[#E8E6E1]/50">
                <div className="flex items-center space-x-4">
                    <div className="font-bold text-lg uppercase tracking-widest text-slate-800">
                        {bookName} <span className="font-serif">{selectedChapter}</span>
                    </div>
                    <div className="h-4 w-px bg-slate-300"></div>
                    <div className="flex items-center space-x-1">
                        <select
                            className="text-xs italic text-slate-500 bg-transparent outline-none cursor-pointer max-w-[150px] overflow-hidden text-ellipsis"
                            value={selectedVersion}
                            onChange={e => setSelectedVersion(Number(e.target.value))}
                        >
                            {versions.length === 0 && <option value={0}>Nenhuma</option>}
                            {versions.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
                        </select>

                        {/* Settings / Import Button */}
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="p-1 text-slate-400 hover:text-slate-800 transition-colors"
                            title="Importar Bíblia"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /><path d="m15 5 3 3" /></svg>
                        </button>

                        {/* Delete Version Button */}
                        {versions.length > 0 && (
                            <button
                                onClick={handleDeleteVersion}
                                className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                title="Deletar Versão"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex items-center space-x-1 sm:space-x-4 text-slate-400">
                    <button
                        onClick={() => setSelectedChapter(Math.max(1, selectedChapter - 1))}
                        className="p-1 hover:text-slate-800 transition-colors"
                        disabled={selectedChapter <= 1}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    </button>

                    <select
                        className="bg-transparent outline-none cursor-pointer text-sm font-semibold hover:text-slate-800 transition-colors appearance-none ml-2 border-b border-transparent hover:border-slate-300"
                        value={selectedBook}
                        onChange={e => { setSelectedBook(Number(e.target.value)); setSelectedChapter(1); }}
                    >
                        {books.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
                    </select>

                    <button
                        onClick={() => setSelectedChapter(selectedChapter + 1)}
                        className="p-1 hover:text-slate-800 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                    </button>

                    <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>

                    <button onClick={() => setIsPanelVisible(false)} className="p-1 hover:text-slate-800 transition-colors hidden sm:block">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><line x1="9" x2="9" y1="3" y2="21" /></svg>
                    </button>
                </div>
            </div>

            {/* Reading Content */}
            <div className="px-8 sm:px-12 py-10 flex-1">
                {/* Header Title */}
                <div className="text-center mt-6 mb-16">
                    <div className="flex items-center justify-center space-x-4 mb-4">
                        <div className="h-[1px] bg-[#DCD9D0] w-12 sm:w-16"></div>
                        <span className="text-[10px] sm:text-xs tracking-[0.2em] font-bold text-[#A68A64] uppercase">
                            {currentBook?.testamento === 'VT' ? 'Antigo Testamento' : 'Novo Testamento'} • {bookName}
                        </span>
                        <div className="h-[1px] bg-[#DCD9D0] w-12 sm:w-16"></div>
                    </div>

                    <h1 className="text-4xl sm:text-5xl font-serif text-[#1C2C40] tracking-tight uppercase px-4" style={{ fontVariant: 'small-caps' }}>
                        Capítulo {selectedChapter}
                    </h1>

                    <div className="mt-8">
                        <div className="h-px bg-gradient-to-r from-transparent via-[#DCD9D0] to-transparent w-32 mx-auto"></div>
                    </div>
                </div>

                {/* Verses */}
                {loading ? (
                    <div className="text-center text-slate-400 py-12 italic font-serif">
                        Carregando...
                    </div>
                ) : verses.length === 0 ? (
                    <div className="text-center text-red-400 py-12 italic font-serif">
                        Este capítulo não foi encontrado.
                    </div>
                ) : (
                    <div
                        className="text-[#3A3D40] font-serif text-lg leading-[2.2] tracking-wide text-justify"
                        style={{ touchAction: 'none' }}
                    >
                        {verses.map((v, i) => {
                            const isFirst = i === 0;
                            const ref = `${currentBook?.sigla || bookName} ${selectedChapter}:${v.numero}`;
                            return (
                                <span
                                    key={v.numero}
                                    onPointerDown={(e) => handlePointerDown(e, v.texto, ref)}
                                    className="inline relative group cursor-grab active:cursor-grabbing hover:bg-[#F2F0EA]/80 transition-colors duration-200 rounded px-1 select-none"
                                >
                                    {!isFirst && (
                                        <sup className="text-[10px] font-sans font-bold text-[#A68A64] mr-1 select-none">
                                            {v.numero}
                                        </sup>
                                    )}
                                    {isFirst ? (
                                        <>
                                            <span className="float-left text-6xl leading-[48px] pt-2 pr-3 pb-1 font-serif text-[#A68A64] select-none">
                                                {v.texto.charAt(0)}
                                            </span>
                                            <span>{v.texto.slice(1)}</span>
                                        </>
                                    ) : (
                                        <span>{v.texto}</span>
                                    )}
                                    {' '}
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Bottom spacer */}
            <div className="h-24"></div>

            {/* Import Modal */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold font-serif text-slate-800 mb-4">Importar Bíblia (JSON)</h2>
                        <form onSubmit={handleImportSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Versão</label>
                                <input
                                    type="text"
                                    required
                                    value={importNome}
                                    onChange={e => setImportNome(e.target.value)}
                                    placeholder="Ex: Almeida Revista e Atualizada"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A68A64]/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Sigla</label>
                                <input
                                    type="text"
                                    required
                                    value={importSigla}
                                    onChange={e => setImportSigla(e.target.value)}
                                    placeholder="Ex: ARA"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A68A64]/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Arquivo JSON</label>
                                <input
                                    type="file"
                                    accept=".json"
                                    required
                                    onChange={e => {
                                        if (e.target.files && e.target.files.length > 0) {
                                            setImportFile(e.target.files[0]);
                                        }
                                    }}
                                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#A68A64]/10 file:text-[#A68A64] hover:file:bg-[#A68A64]/20 cursor-pointer"
                                />
                            </div>
                            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsImportModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isImporting}
                                    className="px-4 py-2 text-sm font-medium text-white bg-[#A68A64] hover:bg-[#8F7655] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                >
                                    {isImporting ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            Processando...
                                        </>
                                    ) : (
                                        "Importar"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
