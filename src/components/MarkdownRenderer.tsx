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
    <div className={`prose prose-sm dark:prose-invert max-w-none prose-headings:tracking-tight prose-p:text-inherit prose-p:leading-7 prose-strong:text-foreground prose-code:text-foreground prose-pre:bg-transparent ${className}`}>
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
                  className="rounded-md bg-white/8 px-1.5 py-0.5 text-[0.92em] font-mono text-primary" 
                  {...props}
                >
                  {children}
                </code>
              );
            }
            
            return (
              <pre className="nebula-well overflow-x-auto rounded-[1.25rem] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
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
              className="text-primary hover:text-primary-glow underline decoration-primary/40 underline-offset-4 transition-colors"
              {...props}
            >
              {children}
            </a>
          ),
          // Customize headings
          h1: ({ children, ...props }) => (
            <h1 className="mb-4 text-2xl font-semibold text-foreground" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="mb-3 text-xl font-semibold text-foreground" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="mb-2 text-lg font-medium text-foreground" {...props}>
              {children}
            </h3>
          ),
          // Customize lists
          ul: ({ children, ...props }) => (
            <ul className="mb-4 list-disc space-y-2 pl-5" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="mb-4 list-decimal space-y-2 pl-5" {...props}>
              {children}
            </ol>
          ),
          // Customize paragraphs
          p: ({ children, ...props }) => (
            <p className="mb-4 leading-7 text-[0.96rem]" {...props}>
              {children}
            </p>
          ),
          // Customize blockquotes
          blockquote: ({ children, ...props }) => (
            <blockquote 
              className="nebula-well rounded-[1.1rem] border-l-0 px-4 py-3 italic text-muted-foreground" 
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