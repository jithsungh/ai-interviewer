import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Play, RotateCcw, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface CodeEditorProps {
  initialCode?: string;
  language?: string;
  onSubmit?: (code: string, language: string) => void;
  onCodeChange?: (code: string) => void;
  isExecuting?: boolean;
  executionOutput?: string | null;
  executionTestResults?: { passed: boolean; name: string }[];
}

const languages = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' }
];

export function CodeEditor({
  initialCode = '',
  language = 'python',
  onSubmit,
  onCodeChange,
  isExecuting: externalIsExecuting,
  executionOutput: externalOutput,
  executionTestResults: externalTestResults,
}: CodeEditorProps) {
  const [code, setCode] = useState(initialCode);
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{ passed: boolean; name: string }[]>([]);

  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  const effectiveIsRunning = externalIsExecuting ?? isRunning;
  const effectiveOutput = externalOutput ?? output;
  const effectiveTestResults = externalTestResults ?? testResults;

  const handleRun = async () => {
    if (onSubmit) {
      onSubmit(code, selectedLanguage);
      return;
    }
    setIsRunning(true);
    setOutput(null);
    
    // Simulate code execution
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setOutput('Output:\n[0, 1]\n\nExecution Time: 4ms');
    setTestResults([
      { passed: true, name: 'Test Case 1' },
      { passed: true, name: 'Test Case 2' },
      { passed: false, name: 'Test Case 3 (Hidden)' }
    ]);
    setIsRunning(false);
  };

  const handleReset = () => {
    setCode(initialCode);
    setOutput(null);
    setTestResults([]);
  };

  return (
    <div className="h-full flex flex-col bg-[var(--card)]">
      {/* Editor Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-[var(--border)] bg-[var(--primary)] text-[var(--primary-foreground)]">
        <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
          <SelectTrigger className="w-32 h-8 bg-transparent border-white/20 text-[var(--primary-foreground)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {languages.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleReset}
            className="text-[var(--primary-foreground)]/80 hover:text-[var(--primary-foreground)] hover:bg-white/10"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          <Button 
            size="sm" 
            onClick={handleRun}
            disabled={effectiveIsRunning}
            className="bg-[var(--secondary)] text-[var(--secondary-foreground)]"
          >
            {effectiveIsRunning ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-1" />
            )}
            Run Code
          </Button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={selectedLanguage}
          value={code}
          onChange={(value) => {
            const v = value || '';
            setCode(v);
            onCodeChange?.(v);
          }}
          theme="vs-dark"
          options={{
            fontSize: 14,
            fontFamily: 'JetBrains Mono, Fira Code, monospace',
            minimap: { enabled: false },
            padding: { top: 16 },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4
          }}
        />
      </div>

      {/* Output Panel */}
      <div className="h-48 border-t border-[var(--border)] bg-[var(--surface)] flex flex-col">
        <div className="h-10 flex items-center px-4 border-b border-[var(--border)]">
          <span className="text-sm font-medium text-[var(--primary)]">Output</span>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {effectiveIsRunning && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Running code...</span>
            </div>
          )}
          
          {effectiveOutput && (
            <div className="space-y-4">
              <pre className="text-sm font-mono text-[var(--primary)]">{effectiveOutput}</pre>
              
              {effectiveTestResults.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Test Results:</span>
                  {effectiveTestResults.map((result, i) => (
                    <div 
                      key={i}
                      className="flex items-center gap-2 text-sm"
                    >
                      {result.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive" />
                      )}
                      <span className={result.passed ? 'text-success' : 'text-destructive'}>
                        {result.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {!effectiveIsRunning && !effectiveOutput && (
            <span className="text-sm text-muted-foreground">
              Click "Run Code" to execute your solution
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
