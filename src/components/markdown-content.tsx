"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const mdComponents: Components = {
  table: ({ children, ...props }) => (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full text-xs border-collapse border border-gray-200 rounded" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-gray-100" {...props}>{children}</thead>
  ),
  th: ({ children, ...props }) => (
    <th className="px-3 py-1.5 text-left font-semibold border border-gray-200" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="px-3 py-1.5 border border-gray-200" {...props}>{children}</td>
  ),
  h1: ({ children, ...props }) => (
    <h1 className="text-xl font-bold mt-4 mb-2" {...props}>{children}</h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="text-lg font-semibold mt-3 mb-1.5 border-b pb-1 border-gray-200" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="text-base font-semibold mt-2 mb-1" {...props}>{children}</h3>
  ),
  ul: ({ children, ...props }) => (
    <ul className="list-disc pl-5 my-1.5 space-y-0.5" {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="list-decimal pl-5 my-1.5 space-y-0.5" {...props}>{children}</ol>
  ),
  li: ({ children, ...props }) => (
    <li className="text-sm leading-relaxed" {...props}>{children}</li>
  ),
  p: ({ children, ...props }) => (
    <p className="text-sm leading-relaxed my-1" {...props}>{children}</p>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-semibold" {...props}>{children}</strong>
  ),
  code: ({ children, className, ...props }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-xs font-mono" {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className="block bg-gray-50 border border-gray-200 rounded p-3 text-xs font-mono overflow-x-auto my-2 whitespace-pre" {...props}>
        {children}
      </code>
    );
  },
  blockquote: ({ children, ...props }) => (
    <blockquote className="border-l-3 border-blue-300 pl-3 my-2 text-gray-600 italic" {...props}>
      {children}
    </blockquote>
  ),
  hr: (props) => <hr className="border-gray-200 my-3" {...props} />,
  a: ({ children, href, ...props }) => {
    let sanitized = href ?? "";
    // Strip hallucinated domains from API paths (e.g. https://yourdomain.com/api/... → /api/...)
    const apiMatch = sanitized.match(/https?:\/\/[^/]+(\/api\/.*)/);
    if (apiMatch) sanitized = apiMatch[1];

    const isExternal = sanitized.startsWith("http");
    return (
      <a
        href={sanitized}
        className="text-blue-600 hover:underline"
        {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        {...props}
      >
        {children}
      </a>
    );
  },
};

export function MarkdownContent({
  content,
  className = "",
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={`prose-sm max-w-none ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
