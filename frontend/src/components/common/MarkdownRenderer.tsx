import React from 'react'
import { parseBlocks, renderInlineMarkdown } from './markdownUtils'

interface MarkdownRendererProps {
  content: string
  className?: string
}

/**
 * Pure React Markdown renderer supporting:
 * - Bold, italic, bold-italic
 * - Headings (H1 - H4)
 * - Ordered & unordered lists
 * - Code blocks & inline code
 * - Markdown tables
 * - Safe clickable links
 */
export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  if (!content) return null

  const blocks = parseBlocks(content)

  return (
    <div className={`space-y-2 leading-relaxed text-xs sm:text-sm ${className}`}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'heading': {
            const children = renderInlineMarkdown(block.text)
            if (block.level === 1) {
              return (
                <h1
                  key={`h1-${idx}`}
                  className="text-base sm:text-lg font-bold text-siftrix-charcoal pt-1 border-b border-siftrix-border/60 pb-1"
                >
                  {children}
                </h1>
              )
            }
            if (block.level === 2) {
              return (
                <h2
                  key={`h2-${idx}`}
                  className="text-sm sm:text-base font-bold text-siftrix-charcoal pt-1"
                >
                  {children}
                </h2>
              )
            }
            if (block.level === 3) {
              return (
                <h3
                  key={`h3-${idx}`}
                  className="text-xs sm:text-sm font-bold text-siftrix-charcoal text-siftrix-antique-ink pt-0.5"
                >
                  {children}
                </h3>
              )
            }
            return (
              <h4 key={`h4-${idx}`} className="text-xs font-bold text-siftrix-charcoal">
                {children}
              </h4>
            )
          }

          case 'list': {
            if (block.ordered) {
              return (
                <ol
                  key={`ol-${idx}`}
                  start={block.start || 1}
                  className="siftrix-markdown-ol list-decimal pl-6 rtl:pr-6 rtl:pl-0 space-y-2 my-2 text-siftrix-graphite"
                >
                  {block.items.map((item, itemIdx) => {
                    const itemValue =
                      item.number !== undefined
                        ? item.number
                        : (block.start || 1) + itemIdx
                    return (
                      <li
                        key={`li-${idx}-${itemIdx}`}
                        value={itemValue}
                        className="leading-relaxed pl-1 rtl:pr-1 rtl:pl-0"
                      >
                        <div>{renderInlineMarkdown(item.text)}</div>
                        {item.subItems && item.subItems.length > 0 ? (
                          <ul className="siftrix-markdown-ul list-disc pl-5 rtl:pr-5 rtl:pl-0 space-y-1 my-1.5 text-siftrix-muted-dark">
                            {item.subItems.map((sub, subIdx) => (
                              <li key={`sub-${idx}-${itemIdx}-${subIdx}`} className="leading-relaxed">
                                {renderInlineMarkdown(sub)}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    )
                  })}
                </ol>
              )
            }
            return (
              <ul
                key={`ul-${idx}`}
                className="siftrix-markdown-ul list-disc pl-6 rtl:pr-6 rtl:pl-0 space-y-1.5 my-2 text-siftrix-graphite"
              >
                {block.items.map((item, itemIdx) => (
                  <li key={`li-${idx}-${itemIdx}`} className="leading-relaxed pl-1 rtl:pr-1 rtl:pl-0">
                    <div>{renderInlineMarkdown(item.text)}</div>
                    {item.subItems && item.subItems.length > 0 ? (
                      <ul className="siftrix-markdown-ul list-disc pl-5 rtl:pr-5 rtl:pl-0 space-y-1 my-1.5 text-siftrix-muted-dark">
                        {item.subItems.map((sub, subIdx) => (
                          <li key={`sub-${idx}-${itemIdx}-${subIdx}`} className="leading-relaxed">
                            {renderInlineMarkdown(sub)}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            )
          }

          case 'table': {
            return (
              <div
                key={`tbl-wrap-${idx}`}
                className="overflow-x-auto my-2 rounded-xl border border-siftrix-border shadow-2xs"
              >
                <table className="min-w-full text-xs text-left border-collapse">
                  <thead className="bg-siftrix-pearl border-b border-siftrix-border">
                    <tr>
                      {block.headers.map((h, hIdx) => (
                        <th
                          key={`th-${idx}-${hIdx}`}
                          className="px-3 py-2 font-semibold text-siftrix-charcoal whitespace-nowrap"
                        >
                          {renderInlineMarkdown(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-siftrix-border/60 bg-white">
                    {block.rows.map((row, rIdx) => (
                      <tr key={`tr-${idx}-${rIdx}`} className="hover:bg-siftrix-pearl/40 transition-colors">
                        {row.map((cell, cIdx) => (
                          <td key={`td-${idx}-${rIdx}-${cIdx}`} className="px-3 py-2 text-siftrix-graphite">
                            {renderInlineMarkdown(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }

          case 'code_block': {
            return (
              <div
                key={`code-wrap-${idx}`}
                className="my-2 rounded-xl bg-[#1D1D22] border border-siftrix-charcoal-border overflow-hidden"
              >
                {block.language ? (
                  <div className="px-3 py-1 bg-[#151518] border-b border-siftrix-charcoal-border text-[10px] font-mono text-siftrix-champagne/80 uppercase tracking-wider">
                    {block.language}
                  </div>
                ) : null}
                <pre className="p-3 overflow-x-auto text-[11px] font-mono text-[#F3EFE6] leading-relaxed">
                  <code>{block.code}</code>
                </pre>
              </div>
            )
          }

          case 'blockquote': {
            return (
              <blockquote
                key={`quote-${idx}`}
                className="border-l-3 border-siftrix-gold pl-3 py-0.5 my-1.5 italic text-siftrix-graphite/90 bg-siftrix-pearl/40 rounded-r-lg"
              >
                {renderInlineMarkdown(block.text)}
              </blockquote>
            )
          }

          case 'hr': {
            return (
              <hr
                key={`hr-${idx}`}
                className="my-3 border-0 border-t border-siftrix-border"
              />
            )
          }

          case 'paragraph': {
            // Respect double/single newlines within paragraph text
            const lines = block.text.split('\n')
            return (
              <p key={`p-${idx}`} className="leading-relaxed my-1">
                {lines.map((line, lIdx) => (
                  <React.Fragment key={`p-line-${idx}-${lIdx}`}>
                    {lIdx > 0 ? <br /> : null}
                    {renderInlineMarkdown(line)}
                  </React.Fragment>
                ))}
              </p>
            )
          }

          default:
            return null
        }
      })}
    </div>
  )
}
