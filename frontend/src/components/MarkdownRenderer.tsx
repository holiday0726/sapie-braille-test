'use client'

import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkEmoji from 'remark-emoji'
import rehypeSanitize from 'rehype-sanitize'
import rehypeKatex from 'rehype-katex'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
// @ts-ignore
import rehypeRaw from 'rehype-raw'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Copy, Check, Sparkles, ChevronRight, ExternalLink, CheckSquare, Square, Circle, Minus } from 'lucide-react'
import 'katex/dist/katex.min.css'

interface MarkdownRendererProps {
  content: string
  className?: string
  isAssistant?: boolean
  animate?: boolean
  theme?: 'dark' | 'light'
  isStreaming?: boolean
}

// Typewriter effect component for animated text
const TypewriterText: React.FC<{ text: string; speed?: number; className?: string }> = ({
  text,
  speed = 20,
  className = ''
}) => {
  const [displayText, setDisplayText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex])
        setCurrentIndex(prev => prev + 1)
      }, speed)
      return () => clearTimeout(timeout)
    }
  }, [currentIndex, text, speed])

  return <span className={className}>{displayText}</span>
}

// 조건부 애니메이션을 위한 헬퍼 함수
const createConditionalComponent = (
  animate: boolean,
  isStreaming: boolean,
  MotionComponent: any,
  RegularComponent: any
) => {
  const shouldAnimate = animate && !isStreaming
  return shouldAnimate ? MotionComponent : RegularComponent
}

// 조건부 props를 위한 헬퍼 함수  
const getAnimationProps = (animate: boolean, isStreaming: boolean, animationProps: any) => {
  const shouldAnimate = animate && !isStreaming
  return shouldAnimate ? animationProps : {}
}

// Enhanced copy button with animations
const CopyButton: React.FC<{ text: string; language: string }> = ({ text, language }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('복사 실패:', err)
    }
  }

  return (
    <motion.button
      onClick={handleCopy}
      className="flex items-center gap-2 px-3 py-1.5 bg-zinc-700/80 hover:bg-zinc-600/80 rounded-lg text-xs font-medium text-gray-200 transition-all duration-200 backdrop-blur-sm border border-zinc-600/30"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={`${language} 코드 복사하기`}
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.div
            key="check"
            initial={{ scale: 0, opacity: 0, rotate: -180 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0, rotate: 180 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="flex items-center gap-1.5 text-emerald-400"
          >
            <Check size={14} />
            <span>복사됨!</span>
          </motion.div>
        ) : (
          <motion.div
            key="copy"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="flex items-center gap-1.5"
          >
            <Copy size={14} />
            <span>복사</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = '',
  isAssistant = false,
  animate = true,
  isStreaming = false,
}) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  })

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6
      }
    }
  }
  // 애니메이션 활성화 여부 결정
  const shouldAnimate = animate && !isStreaming

  return (
    <motion.div
      ref={ref}
      className={`markdown-container relative ${className} ${isAssistant
        ? 'bg-transparent border-none shadow-none'
        : 'bg-gradient-to-br from-gray-900/60 to-gray-800/40'
        } ${isAssistant ? '' : 'backdrop-blur-sm rounded-xl border shadow-lg border-gray-700/50'}`}
      variants={shouldAnimate ? containerVariants : undefined}
      initial={shouldAnimate ? "hidden" : undefined}
      animate={shouldAnimate && inView ? "visible" : undefined}
    >


      {/* AI Badge for non-assistant messages only */}
      {!isAssistant && (
        <motion.div
          className="flex items-center gap-2 px-4 py-2 border-b border-gray-700/50 bg-dark-800/30"
          variants={shouldAnimate ? itemVariants : undefined}
        >
          <motion.div
            animate={shouldAnimate ? { rotate: 360 } : undefined}
            transition={shouldAnimate ? { duration: 8, repeat: Infinity, ease: "linear" } : undefined}
          >
            <Sparkles size={16} />
          </motion.div>
          <span className="text-sm font-medium text-gray-500">
            Enhanced Markdown
          </span>
        </motion.div>
      )}

      <div className={`${isAssistant ? 'p-0' : 'p-6'} prose prose-invert prose-slate max-w-none ${isAssistant ? 'prose-assistant' : 'prose-user'
        } prose-headings:scroll-mt-8 prose-pre:bg-transparent prose-pre:p-0`}>
        <ReactMarkdown
          remarkPlugins={[
            remarkGfm,
            remarkMath,
            remarkEmoji,
          ]}
          rehypePlugins={[
            rehypeRaw,
            rehypeKatex,
            rehypeSlug,
            [rehypeAutolinkHeadings, { behavior: 'wrap' }],
          ]}
          components={{
            // Enhanced code blocks with Gemini-style animations
            code({ node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '')
              const language = match ? match[1] : 'text'
              const codeText = String(children).replace(/\n$/, '')

              if (!inline && match) {
                return (
                  <motion.div
                    className="code-block-wrapper relative group my-6"
                    variants={shouldAnimate ? itemVariants : undefined}
                    whileHover={shouldAnimate ? { scale: 1.01 } : undefined}
                    transition={shouldAnimate ? { type: "spring", stiffness: 300 } : undefined}
                  >
                    {/* Enhanced header with gradient */}
                    <div className="code-block-header flex items-center justify-between rounded-t-xl px-4 py-3 bg-gradient-to-r from-zinc-800 to-zinc-900 border-b border-gray-700/50 backdrop-blur-sm">
                      <div className="flex items-center gap-3">
                        <motion.span
                          aria-hidden="true"
                          className="language-label font-medium text-sm text-gray-500"
                        >
                          {language}
                        </motion.span>
                      </div>
                      <CopyButton text={codeText} language={language} />
                    </div>

                    {/* Code content with enhanced styling */}
                    <div className="relative overflow-hidden rounded-b-xl">
                      <SyntaxHighlighter
                        style={oneDark}
                        language={language}
                        PreTag="div"
                        className="!mt-0 !mb-0 !rounded-none !border-0 !bg-transparent"
                        showLineNumbers={true}
                        wrapLines={true}
                        lineNumberStyle={{
                          minWidth: '3em',
                          paddingRight: '1em',
                          color: '#6B7280',
                          backgroundColor: 'transparent',
                          borderRight: `1px solid #374151`,
                          marginRight: '1em'
                        }}
                        lineProps={{
                          style: {
                            wordBreak: 'break-all',
                            whiteSpace: 'pre-wrap',
                            backgroundColor: 'transparent'
                          }
                        }}
                        {...props}
                      >
                        {codeText}
                      </SyntaxHighlighter>
                    </div>
                  </motion.div>
                )
              } else {
                return (
                  <motion.code
                    className={`${className} inline-code px-2 py-1 rounded-md text-sm font-mono bg-gray-100/70 text-gray-800 border border-gray-300/50 backdrop-blur-sm`}
                    whileHover={shouldAnimate ? { scale: 1.05 } : undefined}
                    transition={shouldAnimate ? { type: "spring", stiffness: 400 } : undefined}
                    {...props}
                  >
                    {children}
                  </motion.code>
                )
              }
            },

            // Animated headings
            h1: ({ children, ...props }) => {
              const { node, ...restProps } = props as any;
              return (
                <motion.h1
                  className="group flex items-center gap-3 text-3xl font-bold mb-6 mt-8 pb-3 border-b text-white border-gray-700/50"
                  variants={shouldAnimate ? itemVariants : undefined}
                  whileHover={shouldAnimate ? { x: 5 } : undefined}
                  {...restProps}
                >
                  <motion.div
                    initial={shouldAnimate ? { rotate: 0 } : undefined}
                    whileHover={shouldAnimate ? { rotate: 90 } : undefined}
                    transition={shouldAnimate ? { type: "spring", stiffness: 300 } : undefined}
                  >
                    <ChevronRight size={24} />
                  </motion.div>
                  {shouldAnimate ? <TypewriterText text={String(children)} speed={30} /> : children}
                </motion.h1>
              );
            },
            h2: ({ children, ...props }) => {
              const { node, ...restProps } = props as any;
              return (
                <motion.h2
                  className="group flex items-center gap-2 text-2xl font-semibold mb-4 mt-6 text-gray-100"
                  variants={shouldAnimate ? itemVariants : undefined}
                  whileHover={shouldAnimate ? { x: 3 } : undefined}
                  {...restProps}
                >
                  <motion.div
                    className="w-1 h-6 rounded-full bg-primary-500"
                    whileHover={shouldAnimate ? { scaleY: 1.2 } : undefined}
                  />
                  {children}
                </motion.h2>
              );
            },
            h3: ({ children, ...props }) => {
              const { node, ...restProps } = props as any;
              return (
                <motion.h3
                  className="text-xl font-medium mb-3 mt-5 text-gray-200"
                  variants={shouldAnimate ? itemVariants : undefined}
                  whileHover={shouldAnimate ? { x: 2 } : undefined}
                  {...restProps}
                >
                  <span className="mr-2 text-gray-400">▸</span>
                  {children}
                </motion.h3>
              );
            },

            // Blockquotes with animations
            blockquote: ({ children, ...props }) => {
              const { node, ...restProps } = props as any;
              return (
                <motion.blockquote
                  className="relative border-l-4 border-gray-300 pl-4 pr-4 py-2 mt-0 mb-6 italic rounded-r-lg bg-gray-100 text-gray-700 backdrop-blur-sm"
                  variants={shouldAnimate ? itemVariants : undefined}
                  whileHover={shouldAnimate ? { scale: 1.02, x: 5 } : undefined}
                  transition={shouldAnimate ? { type: "spring", stiffness: 300 } : undefined}
                  {...restProps}
                >
                  {children}
                </motion.blockquote>
              );
            },

            // Gemini-style tables with enhanced animations
            table: ({ children, ...props }) => {
              const { node, ...restProps } = props as any;
              return (
                <motion.div
                  className="table-wrapper overflow-x-auto my-6 rounded-xl shadow-2xl bg-gradient-to-br from-dark-800/90 to-dark-900/90 border border-gray-700/50"
                  variants={shouldAnimate ? itemVariants : undefined}
                  whileHover={shouldAnimate ? { scale: 1.01 } : undefined}
                  initial={shouldAnimate ? { opacity: 0, y: 20 } : undefined}
                  animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
                  transition={shouldAnimate ? { delay: 0.1 } : undefined}
                >
                  <motion.table
                    className="min-w-full border-collapse"
                    {...restProps}
                  >
                    {children}
                  </motion.table>
                </motion.div>
              );
            },
            thead: ({ children, ...props }) => {
              const { node, ...restProps } = props as any;
              return (
                <thead
                  className="bg-gradient-to-r from-dark-700/80 to-dark-800/80"
                  {...restProps}
                >
                  {children}
                </thead>
              );
            },
            tbody: ({ children, ...props }) => {
              const { node, ...restProps } = props as any;
              return (
                <tbody {...restProps}>
                  {children}
                </tbody>
              );
            },
            tr: ({ children, ...props }) => {
              const { node, ...restProps } = props as any;
              return (
                <motion.tr
                  className="transition-all duration-200"
                  whileHover={shouldAnimate ? { backgroundColor: 'rgba(31, 41, 55, 0.7)' } : undefined}
                  {...restProps}
                >
                  {children}
                </motion.tr>
              );
            },
            th: ({ children, ...props }) => {
              const { node, ...restProps } = props as any;
              return (
                <motion.th
                  className="px-6 py-4 text-left font-semibold border-b-2 text-gray-100 border-gray-600 bg-dark-850/80"
                  whileHover={shouldAnimate ? {
                    backgroundColor: '#2f2f30',
                    scale: 1.01
                  } : undefined}
                  transition={shouldAnimate ? { duration: 0.2 } : undefined}
                  {...restProps}
                >
                  {children}
                </motion.th>
              );
            },
            td: ({ children, ...props }) => {
              const { node, ...restProps } = props as any;
              return (
                <motion.td
                  className="px-6 py-4 border-b last:border-b-0 text-gray-300 border-gray-700 bg-dark-800/30"
                  whileHover={shouldAnimate ? {
                    backgroundColor: '#2f2f30',
                    scale: 1.005,
                    y: -1
                  } : undefined}
                  transition={shouldAnimate ? { duration: 0.2 } : undefined}
                  {...restProps}
                >
                  {children}
                </motion.td>
              );
            },

            // Gemini-style animated lists
            ul: ({ children, ...props }) => {
              const { node, ...restProps } = props as any;
              return (
                <motion.ul
                  className="space-y-3 my-6 text-gray-800"
                  variants={shouldAnimate ? {
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.1
                      }
                    }
                  } : undefined}
                  initial={shouldAnimate ? "hidden" : undefined}
                  animate={shouldAnimate ? "visible" : undefined}
                  {...restProps}
                >
                  {children}
                </motion.ul>
              );
            },
            ol: ({ children, ...props }) => {
              const { node, ...restProps } = props as any;
              return (
                <motion.ol
                  className="space-y-3 my-6 counter-reset-list text-gray-800"
                  variants={shouldAnimate ? {
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.1
                      }
                    }
                  } : undefined}
                  initial={shouldAnimate ? "hidden" : undefined}
                  animate={shouldAnimate ? "visible" : undefined}
                  {...restProps}
                >
                  {children}
                </motion.ol>
              );
            },
            li: ({ children, ...props }) => {
              const { node, ...restProps } = props as any;

              // Check if this is a task list item (checkbox)
              const childrenArray = React.Children.toArray(children);
              const firstChild = childrenArray[0];

              let isTaskList = false;
              let isChecked = false;
              let taskListContent = children;

              if (typeof firstChild === 'string') {
                // Check for checkbox patterns
                const checkboxMatch = firstChild.match(/^\s*\[([ xX])\]\s*(.*)$/);
                if (checkboxMatch) {
                  isTaskList = true;
                  isChecked = checkboxMatch[1].toLowerCase() === 'x';
                  taskListContent = checkboxMatch[2] + (childrenArray.slice(1).join('') || '');
                }
              }

              if (isTaskList) {
                return (
                  <motion.li
                    className="flex items-start gap-3 leading-relaxed p-3 rounded-lg transition-all duration-200 hover:bg-dark-800/30 border-l-2 border-transparent hover:border-green-400"
                    variants={shouldAnimate ? {
                      hidden: { opacity: 0, x: -20 },
                      visible: { opacity: 1, x: 0 }
                    } : undefined}
                    whileHover={shouldAnimate ? { x: 5 } : undefined}
                    {...restProps}
                  >
                    <motion.div
                      className={`mt-0.5 flex-shrink-0 ${isChecked
                        ? 'text-green-400'
                        : 'text-dark-400'
                        }`}
                      whileHover={shouldAnimate ? { scale: 1.1 } : undefined}
                      whileTap={shouldAnimate ? { scale: 0.9 } : undefined}
                    >
                      {isChecked ? (
                        <CheckSquare size={18} />
                      ) : (
                        <Square size={18} />
                      )}
                    </motion.div>
                    <span className={`flex-1 ${isChecked
                      ? `line-through opacity-60 text-gray-500`
                      : ''
                      }`}>
                      {taskListContent}
                    </span>
                  </motion.li>
                );
              }

              // Regular list item
              return (
                <motion.li
                  className="flex items-start gap-3 leading-relaxed p-3 rounded-lg transition-all duration-200 hover:bg-gray-200/30 border-l-2 border-transparent hover:border-gray-400"
                  variants={shouldAnimate ? {
                    hidden: { opacity: 0, x: -20 },
                    visible: { opacity: 1, x: 0 }
                  } : undefined}
                  whileHover={shouldAnimate ? { x: 5 } : undefined}
                  {...restProps}
                >
                  <motion.div
                    className="mt-2 flex-shrink-0"
                    whileHover={shouldAnimate ? { scale: 1.2, rotate: 180 } : undefined}
                    transition={shouldAnimate ? { type: "spring", stiffness: 300 } : undefined}
                  >
                    <Circle size={6} />
                  </motion.div>
                  <span className="flex-1">{children}</span>
                </motion.li>
              );
            },

            // Gemini-style paragraphs with subtle animations
            p: ({ children, ...props }) => {
              const { node, ...restProps } = props as any;
              return (
                <motion.p
                  className="leading-relaxed mb-6 last-mb-0 text-[#252528]"
                  variants={shouldAnimate ? itemVariants : undefined}
                  {...restProps}
                >
                  {children}
                </motion.p>
              );
            },

            // External links only
            a: ({ children, href, ...props }) => {
              const { node, ...restProps } = props as any;
              const isExternal = href?.startsWith('http');

              // Only render as link if external, otherwise render as plain text
              if (!isExternal) {
                return <span {...restProps}>{children}</span>;
              }

              return (
                <motion.a
                  href={href}
                  className="inline-flex items-center gap-1 font-medium underline-offset-4 transition-all duration-200 text-blue-600 hover:text-blue-700 decoration-blue-600/50 hover:decoration-blue-700 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={shouldAnimate ? { scale: 1.05 } : undefined}
                  whileTap={shouldAnimate ? { scale: 0.95 } : undefined}
                  {...restProps}
                >
                  {children}
                  <motion.span
                    initial={shouldAnimate ? { opacity: 0, scale: 0.8 } : undefined}
                    animate={shouldAnimate ? { opacity: 1, scale: 1 } : undefined}
                    transition={shouldAnimate ? { delay: 0.1 } : undefined}
                  >
                    <ExternalLink size={14} />
                  </motion.span>
                </motion.a>
              );
            },

            // Enhanced text formatting
            strong: ({ children, ...props }) => {
              const { node, ...restProps } = props as any;
              return (
                <motion.strong
                  className="font-semibold text-black"
                  whileHover={shouldAnimate ? { scale: 1.05 } : undefined}
                  {...restProps}
                >
                  {children}
                </motion.strong>
              );
            },
            em: ({ children, ...props }) => {
              const { node, ...restProps } = props as any;
              return (
                <motion.em
                  className="italic font-medium text-gray-800"
                  whileHover={shouldAnimate ? { scale: 1.02 } : undefined}
                  {...restProps}
                >
                  {children}
                </motion.em>
              );
            },

            // Enhanced images with lazy loading and animations
            img: ({ src, alt, title, ...props }) => {
              const { node, ...restProps } = props as any;
              return (
                <motion.div
                  className="my-6 overflow-hidden rounded-xl"
                  variants={shouldAnimate ? itemVariants : undefined}
                  whileHover={shouldAnimate ? { scale: 1.02 } : undefined}
                  transition={shouldAnimate ? { type: "spring", stiffness: 300 } : undefined}
                >
                  <motion.img
                    src={src}
                    alt={alt}
                    title={title}
                    className={`w-full h-auto rounded-xl shadow-lg border border-gray-300/50`}
                    loading="lazy"
                    initial={shouldAnimate ? { opacity: 0, scale: 0.9 } : undefined}
                    animate={shouldAnimate ? { opacity: 1, scale: 1 } : undefined}
                    transition={shouldAnimate ? { duration: 0.5 } : undefined}
                    {...restProps}
                  />
                  {(alt || title) && (
                    <motion.p
                      className={`text-center text-sm mt-2 italic text-gray-500`}
                      initial={shouldAnimate ? { opacity: 0 } : undefined}
                      animate={shouldAnimate ? { opacity: 1 } : undefined}
                      transition={shouldAnimate ? { delay: 0.3 } : undefined}
                    >
                      {title || alt}
                    </motion.p>
                  )}
                </motion.div>
              );
            },

            // Enhanced line breaks
            br: ({ ...props }) => {
              const { node, ...restProps } = props as any;
              return (
                <motion.div
                  className="my-2"
                  initial={shouldAnimate ? { opacity: 0, scaleX: 0 } : undefined}
                  animate={shouldAnimate ? { opacity: 1, scaleX: 1 } : undefined}
                  transition={shouldAnimate ? { duration: 0.3 } : undefined}
                  {...restProps}
                />
              );
            },

            // Minimal horizontal rule
            hr: ({ ...props }) => {
              const { node, ...restProps } = props as any;
              return (
                <motion.div
                  className="my-6"
                  variants={shouldAnimate ? itemVariants : undefined}
                  {...restProps}
                >
                  <motion.div
                    className="h-px w-full bg-gray-300"
                    initial={shouldAnimate ? { scaleX: 0 } : undefined}
                    animate={shouldAnimate ? { scaleX: 1 } : undefined}
                    transition={shouldAnimate ? { duration: 0.3 } : undefined}
                  />
                </motion.div>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>

      {/* Gemini-style subtle footer - only for non-assistant messages */}
      {!isAssistant && (
        <motion.div
          className="px-6 py-3 border-t text-center text-xs border-gray-300/50 text-gray-500"
          variants={shouldAnimate ? itemVariants : undefined}
        >
          <div className="flex items-center justify-center gap-2">
            <Sparkles size={12} />
            <span>Enhanced with AI-powered formatting</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

export default MarkdownRenderer