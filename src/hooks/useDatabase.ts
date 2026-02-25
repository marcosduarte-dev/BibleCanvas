/**
 * React hook for accessing the BibleCanvas database via IPC
 * Provides methods to query verses, versions, books, and annotations
 */

interface Versao {
    id: number
    nome: string
    sigla: string
    idioma: string
}

interface Livro {
    id: number
    testamento?: string
    nome: string
    sigla?: string
    ordem?: number
}

interface Versiculo {
    id: number
    versao_id: number
    livro_id: number
    capitulo: number
    numero: number
    texto: string
}

interface AnotacaoCanvas {
    id: number
    livro_id: number
    capitulo: number
    dados_json: string
    ultima_atualizacao: string
}

interface DbResponse<T> {
    success: boolean
    data?: T
    error?: string
}

/**
 * Get all available Bible versions
 */
export async function getVersoes(): Promise<Versao[]> {
    try {
        const api = (window as any).api
        if (!api) {
            throw new Error('API not available - preload script not loaded')
        }

        const response = await api.invoke('db:get-versoes') as DbResponse<Versao[]>

        if (!response.success) {
            throw new Error(response.error || 'Failed to get versions')
        }

        return response.data || []
    } catch (error) {
        console.error('Error fetching versions:', error)
        return []
    }
}

/**
 * Get all Bible books
 */
export async function getLivros(): Promise<Livro[]> {
    try {
        const api = (window as any).api
        if (!api) {
            throw new Error('API not available - preload script not loaded')
        }

        const response = await api.invoke('db:get-livros') as DbResponse<Livro[]>

        if (!response.success) {
            throw new Error(response.error || 'Failed to get books')
        }

        return response.data || []
    } catch (error) {
        console.error('Error fetching books:', error)
        return []
    }
}

/**
 * Get verses for a specific book, chapter, and version
 */
export async function getVersiculos(
    versao_id: number,
    livro_id: number,
    capitulo: number
): Promise<Versiculo[]> {
    try {
        const api = (window as any).api
        if (!api) {
            throw new Error('API not available - preload script not loaded')
        }

        const response = await api.invoke('db:get-versiculos', {
            versao_id,
            livro_id,
            capitulo
        }) as DbResponse<Versiculo[]>

        if (!response.success) {
            throw new Error(response.error || 'Failed to get verses')
        }

        return response.data || []
    } catch (error) {
        console.error('Error fetching verses:', error)
        return []
    }
}

/**
 * Get canvas annotation for a specific book and chapter
 */
export async function getAnotacao(
    livro_id: number,
    capitulo: number
): Promise<AnotacaoCanvas | null> {
    try {
        const api = (window as any).api
        if (!api) {
            throw new Error('API not available - preload script not loaded')
        }

        const response = await api.invoke('db:get-anotacao', {
            livro_id,
            capitulo
        }) as DbResponse<AnotacaoCanvas>

        if (!response.success) {
            throw new Error(response.error || 'Failed to get annotation')
        }

        return response.data || null
    } catch (error) {
        console.error('Error fetching annotation:', error)
        return null
    }
}

/**
 * Save or update canvas annotation for a specific book and chapter
 */
export async function saveAnotacao(
    livro_id: number,
    capitulo: number,
    dados_json: string
): Promise<boolean> {
    try {
        const api = (window as any).api
        if (!api) {
            throw new Error('API not available - preload script not loaded')
        }

        const response = await api.invoke('db:save-anotacao', {
            livro_id,
            capitulo,
            dados_json
        }) as DbResponse<void>

        if (!response.success) {
            throw new Error(response.error || 'Failed to save annotation')
        }

        return true
    } catch (error) {
        console.error('Error saving annotation:', error)
        return false
    }
}

/**
 * Import a new Bible version from a JSON object
 */
export async function importVersion(
    nome: string,
    sigla: string,
    idioma: string,
    jsonData: any
): Promise<boolean> {
    try {
        const api = (window as any).api
        if (!api) {
            throw new Error('API not available - preload script not loaded')
        }

        const response = await api.invoke('db:import-version', {
            nome,
            sigla,
            idioma,
            jsonData
        }) as DbResponse<{ id: number }>

        if (!response.success) {
            throw new Error(response.error || 'Failed to import version')
        }

        return true
    } catch (error) {
        console.error('Error importing version:', error)
        return false
    }
}

/**
 * Delete a Bible version
 */
export async function deleteVersion(versao_id: number): Promise<boolean> {
    try {
        const api = (window as any).api
        if (!api) {
            throw new Error('API not available - preload script not loaded')
        }

        const response = await api.invoke('db:delete-version', { versao_id }) as DbResponse<void>

        if (!response.success) {
            throw new Error(response.error || 'Failed to delete version')
        }

        return true
    } catch (error) {
        console.error('Error deleting version:', error)
        return false
    }
}
