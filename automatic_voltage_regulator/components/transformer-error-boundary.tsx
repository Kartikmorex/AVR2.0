"use client"

import React from "react"
import { AlertTriangle, RefreshCw, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ErrorBoundary } from "@/components/error-boundary"

interface TransformerErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

const TransformerErrorFallback: React.FC<TransformerErrorFallbackProps> = ({ 
  error, 
  resetErrorBoundary 
}) => {
  const isNetworkError = error.message.includes('fetch') || error.message.includes('network')
  const isDataError = error.message.includes('transformer') || error.message.includes('device')

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-6 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <h2 className="text-lg font-semibold text-amber-800">
          {isNetworkError ? 'Connection Error' : isDataError ? 'Data Error' : 'Transformer Error'}
        </h2>
      </div>
      
      <p className="text-amber-700 text-center mb-4 max-w-md">
        {isNetworkError 
          ? 'Unable to connect to the transformer data service. Please check your connection and try again.'
          : isDataError
          ? 'There was an issue loading transformer data. The transformer may be offline or the data format is invalid.'
          : 'An unexpected error occurred with the transformer component.'
        }
      </p>

      <div className="flex gap-3">
        <Button 
          onClick={resetErrorBoundary} 
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
        
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline"
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Reload Page
        </Button>
      </div>

      <details className="mt-4 text-sm max-w-md">
        <summary className="cursor-pointer text-amber-700 hover:text-amber-800 text-center">
          Technical details
        </summary>
        <pre className="mt-2 p-2 bg-amber-100 rounded text-xs text-amber-800 whitespace-pre-wrap overflow-auto">
          {error.message}
          {error.stack && '\n\nStack trace:\n' + error.stack.split('\n').slice(0, 5).join('\n')}
        </pre>
      </details>
    </div>
  )
}

interface TransformerErrorBoundaryProps {
  children: React.ReactNode
  transformerId?: string
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

export function TransformerErrorBoundary({ 
  children, 
  transformerId,
  onError 
}: TransformerErrorBoundaryProps) {
  const handleError = React.useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    // Log error with transformer context
    console.error(`Error in transformer ${transformerId}:`, error, errorInfo)
    
    // Send to error reporting service if available
    if (typeof window !== 'undefined' && 'gtag' in window) {
      // Example: Google Analytics error tracking
      ;(window as any).gtag('event', 'exception', {
        description: `Transformer Error: ${error.message}`,
        fatal: false,
        transformer_id: transformerId
      })
    }
    
    onError?.(error, errorInfo)
  }, [transformerId, onError])

  return (
    <ErrorBoundary
      fallback={TransformerErrorFallback}
      onError={handleError}
      resetKeys={[transformerId]}
      resetOnPropsChange={true}
    >
      {children}
    </ErrorBoundary>
  )
}