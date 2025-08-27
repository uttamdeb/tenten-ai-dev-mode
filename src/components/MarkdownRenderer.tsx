import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  children: string;
  className?: string;
}

export function MarkdownRenderer({ children, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Customize code blocks
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;
            
            if (isInline) {
              return (
                <code 
                  className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" 
                  {...props}
                >
                  {children}
                </code>
              );
            }
            
            return (
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          // Customize links
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary-glow underline transition-colors"
              {...props}
            >
              {children}
            </a>
          ),
          // Customize headings
          h1: ({ children, ...props }) => (
            <h1 className="text-xl font-bold mb-3 text-foreground" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="text-lg font-semibold mb-2 text-foreground" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="text-base font-medium mb-2 text-foreground" {...props}>
              {children}
            </h3>
          ),
          // Customize lists
          ul: ({ children, ...props }) => (
            <ul className="list-disc list-inside space-y-1 mb-3" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="list-decimal list-inside space-y-1 mb-3" {...props}>
              {children}
            </ol>
          ),
          // Customize paragraphs
          p: ({ children, ...props }) => (
            <p className="mb-3 leading-relaxed" {...props}>
              {children}
            </p>
          ),
          // Customize blockquotes
          blockquote: ({ children, ...props }) => (
            <blockquote 
              className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground bg-muted/30 py-2 rounded-r-md" 
              {...props}
            >
              {children}
            </blockquote>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}