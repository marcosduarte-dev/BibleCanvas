import { Tldraw, Editor, toRichText } from 'tldraw';
import 'tldraw/tldraw.css';
import React, { useRef, useEffect } from 'react';
import { getAnotacao, saveAnotacao } from '../hooks/useDatabase';

export default function Canvas() {
    const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const editorRef = useRef<Editor | null>(null);
    const lastDropTimeRef = useRef<number>(0);

    useEffect(() => {
        const handleCustomDrop = (e: Event) => {
            const customEvent = e as CustomEvent;
            const editor = editorRef.current;
            if (!editor) return;
            const { clientX, clientY, text, ref } = customEvent.detail;

            const now = Date.now();
            if (now - lastDropTimeRef.current < 100) return;
            lastDropTimeRef.current = now;

            const pagePoint = editor.screenToPage({ x: clientX, y: clientY });

            editor.createShape({
                type: 'note',
                x: pagePoint.x,
                y: pagePoint.y,
                props: {
                    richText: toRichText(`${text}\n\n(${ref})`),
                    color: 'yellow'
                }
            });
        };

        window.addEventListener('tldrawDropVerse', handleCustomDrop);
        return () => window.removeEventListener('tldrawDropVerse', handleCustomDrop);
    }, []);

    const handleMount = (editorInstance: Editor) => {
        editorRef.current = editorInstance;

        getAnotacao(1, 1).then((data) => {
            if (data) {
                try {
                    const snapshot = JSON.parse(data.dados_json);
                    editorInstance.loadSnapshot(snapshot);
                } catch (e) {
                    console.error("Failed to load snapshot", e);
                }
            }
        });

        // Setup auto-save every 2 seconds
        if (!saveIntervalRef.current) {
            saveIntervalRef.current = setInterval(() => {
                const snapshot = editorInstance.getSnapshot();
                saveAnotacao(1, 1, JSON.stringify(snapshot));
                console.log('Auto-saved canvas');
            }, 2000);
        }

        // Attach native drag and drop listeners
        const container = editorInstance.getContainer();
        const onDragOverNative = (e: DragEvent) => e.preventDefault();
        const onDropNative = (e: DragEvent) => {
            handleDrop(e);
        };

        container.addEventListener('dragover', onDragOverNative);
        container.addEventListener('drop', onDropNative);

        // Optional cleanup is good practice, but not strictly needed here if Editor lives forever
    };

    const handleDrop = (e: React.DragEvent | DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!editorRef.current) return;

        // Handle native DragEvent data transfer vs React DragEvent
        const dataTransfer = 'dataTransfer' in e ? e.dataTransfer : null;
        if (!dataTransfer) return;

        // Prevent double drop firing within 100ms
        const now = Date.now();
        if (now - lastDropTimeRef.current < 100) {
            return;
        }
        lastDropTimeRef.current = now;

        const text = dataTransfer.getData('text/plain');
        const ref = dataTransfer.getData('bible/ref');

        if (text) {
            // Convert screen point to page point
            const pagePoint = editorRef.current.screenToPage({ x: e.clientX, y: e.clientY });

            editorRef.current.createShape({
                type: 'note',
                x: pagePoint.x,
                y: pagePoint.y,
                props: {
                    richText: toRichText(`${text}\n\n(${ref})`),
                    color: 'yellow'
                }
            });
        }
    };

    return (
        <div className="w-full h-full absolute inset-0 z-0 bg-gray-50">
            <Tldraw onMount={handleMount} />
        </div>
    );
}
