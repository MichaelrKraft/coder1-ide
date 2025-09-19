/**
 * Repository Intelligence Service for Monaco Editor
 * Provides context-aware code suggestions based on analyzed repositories
 */

interface RepositoryData {
    id: string;
    name: string;
    url: string;
    intelligence?: any;
}

interface CodeSuggestion {
    label: string;
    insertText: string;
    documentation?: string;
    detail?: string;
    confidence?: number;
    category?: string;
}

class RepositoryIntelliSenseService {
    private activeRepository: RepositoryData | null = null;
    private suggestionCache: Map<string, CodeSuggestion[]> = new Map();
    private monaco: any = null;
    private disposables: any[] = [];

    /**
     * Initialize the service with Monaco instance
     */
    initialize(monaco: any) {
        if (this.monaco) {
            return; // Already initialized
        }

        this.monaco = monaco;
        console.log('🧠 Repository IntelliSense Service initialized');

        // Register completion provider for multiple languages
        const languages = ['javascript', 'typescript', 'javascriptreact', 'typescriptreact', 'python', 'java', 'go'];
        
        languages.forEach(language => {
            const provider = this.monaco.languages.registerCompletionItemProvider(language, {
                provideCompletionItems: this.provideCompletionItems.bind(this)
            });
            this.disposables.push(provider);
        });

        // Check for active repository from terminal session
        this.checkForActiveRepository();
    }

    /**
     * Check if a repository has been loaded via terminal
     */
    private async checkForActiveRepository() {
        try {
            // Check localStorage for active repository (set by terminal commands)
            const storedRepo = localStorage.getItem('activeRepository');
            if (storedRepo) {
                this.activeRepository = JSON.parse(storedRepo);
                console.log('📚 Active repository detected:', this.activeRepository?.name);
            }

            // Also check for repository data from backend
            const response = await fetch('/api/repository/status');
            if (response.ok) {
                const data = await response.json();
                if (data.activeRepository) {
                    this.activeRepository = data.activeRepository;
                    localStorage.setItem('activeRepository', JSON.stringify(this.activeRepository));
                }
            }
        } catch (error) {
            console.warn('Could not check for active repository:', error);
        }
    }

    /**
     * Provide completion items based on repository intelligence
     */
    private async provideCompletionItems(model: any, position: any, context: any, token: any) {
        const suggestions: any[] = [];

        // If no repository is loaded, return default suggestions
        if (!this.activeRepository) {
            return { suggestions };
        }

        try {
            // Get current line and context
            const lineContent = model.getLineContent(position.lineNumber);
            const wordUntilPosition = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                startColumn: wordUntilPosition.startColumn,
                endLineNumber: position.lineNumber,
                endColumn: wordUntilPosition.endColumn
            };

            // Check cache first
            const cacheKey = `${this.activeRepository.id}_${lineContent}_${position.column}`;
            if (this.suggestionCache.has(cacheKey)) {
                const cachedSuggestions = this.suggestionCache.get(cacheKey)!;
                return {
                    suggestions: this.convertToMonacoSuggestions(cachedSuggestions, range)
                };
            }

            // Get suggestions from backend
            const response = await fetch('/api/repository/suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    repoId: this.activeRepository.id,
                    currentCode: model.getValue(),
                    cursorPosition: model.getOffsetAt(position),
                    lineContent,
                    language: model.getLanguageId()
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.suggestions && data.suggestions.length > 0) {
                    // Cache the suggestions
                    this.suggestionCache.set(cacheKey, data.suggestions);
                    
                    // Add repository-aware suggestions
                    const repoSuggestions = this.convertToMonacoSuggestions(data.suggestions, range);
                    suggestions.push(...repoSuggestions);
                }
            }
        } catch (error) {
            console.warn('Failed to get repository suggestions:', error);
        }

        // Add some default intelligent suggestions based on context
        if (this.activeRepository) {
            suggestions.push(...this.getDefaultRepositorySuggestions(model, position));
        }

        return { suggestions };
    }

    /**
     * Convert our suggestions to Monaco format
     */
    private convertToMonacoSuggestions(suggestions: CodeSuggestion[], range: any): any[] {
        return suggestions.map((suggestion, index) => ({
            label: suggestion.label,
            kind: this.monaco.languages.CompletionItemKind.Function,
            documentation: {
                value: `**From ${this.activeRepository?.name}**\n\n${suggestion.documentation || ''}`,
                isTrusted: true
            },
            insertText: suggestion.insertText,
            insertTextRules: this.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: suggestion.detail || `Repository pattern (${Math.round((suggestion.confidence || 0.8) * 100)}% confidence)`,
            range: range,
            sortText: `0${index}`, // Prioritize repository suggestions
            preselect: index === 0
        }));
    }

    /**
     * Get default repository-based suggestions
     */
    private getDefaultRepositorySuggestions(model: any, position: any): any[] {
        const suggestions: any[] = [];
        const lineContent = model.getLineContent(position.lineNumber);
        const wordUntilPosition = model.getWordUntilPosition(position);
        const range = {
            startLineNumber: position.lineNumber,
            startColumn: wordUntilPosition.startColumn,
            endLineNumber: position.lineNumber,
            endColumn: wordUntilPosition.endColumn
        };

        // Add repository-specific patterns
        if (this.activeRepository?.name?.includes('react')) {
            // React-specific suggestions
            if (lineContent.includes('use')) {
                suggestions.push({
                    label: 'useState',
                    kind: this.monaco.languages.CompletionItemKind.Function,
                    documentation: 'React state hook from repository patterns',
                    insertText: 'const [$1, set$2] = useState($3);',
                    insertTextRules: this.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: `From ${this.activeRepository.name}`,
                    range,
                    sortText: '00'
                });

                suggestions.push({
                    label: 'useEffect',
                    kind: this.monaco.languages.CompletionItemKind.Function,
                    documentation: 'React effect hook from repository patterns',
                    insertText: 'useEffect(() => {\n  $1\n}, [$2]);',
                    insertTextRules: this.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: `From ${this.activeRepository.name}`,
                    range,
                    sortText: '01'
                });
            }
        }

        return suggestions;
    }

    /**
     * Set active repository from terminal command
     */
    setActiveRepository(repository: RepositoryData) {
        this.activeRepository = repository;
        this.suggestionCache.clear(); // Clear cache when repository changes
        localStorage.setItem('activeRepository', JSON.stringify(repository));
        console.log('🎯 Repository IntelliSense activated for:', repository.name);
    }

    /**
     * Get current active repository
     */
    getActiveRepository(): RepositoryData | null {
        return this.activeRepository;
    }

    /**
     * Clear active repository
     */
    clearActiveRepository() {
        this.activeRepository = null;
        this.suggestionCache.clear();
        localStorage.removeItem('activeRepository');
    }

    /**
     * Dispose of the service
     */
    dispose() {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        this.suggestionCache.clear();
        this.monaco = null;
    }
}

// Export singleton instance
const repositoryIntelliSense = new RepositoryIntelliSenseService();
export default repositoryIntelliSense;