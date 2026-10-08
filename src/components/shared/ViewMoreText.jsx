import React, { useState } from "react";
import Modal from "../ui/Modal";
import { linkifyHtml } from "../ui/renderTextWithLinks";

export default function ViewMoreText({ text, content, maxLength = 30, title = "Details" }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!text) return <span>-</span>;
  const strText = String(text);
  
  const getPlainText = (html) => {
    if (typeof document === 'undefined') return html.replace(/<[^>]*>?/gm, '').trim();
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const plainText = getPlainText(strText);
  const hasHTML = /<[a-z][\s\S]*>/i.test(strText);

  if (plainText.length <= maxLength) {
      if (hasHTML) {
          return <div className="prose dark:prose-invert max-w-none text-sm leading-tight" dangerouslySetInnerHTML={{ __html: linkifyHtml(strText) }} />;
      }
      return content || <span>{strText}</span>;
  }

  const truncated = plainText.slice(0, maxLength) + "...";

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span>{truncated}</span>
      <button 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
        className="text-blue-500 hover:text-blue-700 cursor-pointer text-xs font-medium underline-offset-2 hover:underline animate-pulse-subtle shrink-0"
      >
        view more
      </button>

      {isOpen && (
        <Modal 
          open={isOpen} 
          onClose={() => setIsOpen(false)} 
          title={title}
        >
          {hasHTML ? (
            <div 
              className="text-sm text-gray-700 dark:text-gray-300 max-h-96 overflow-y-auto pr-2 prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: linkifyHtml(strText) }}
            />
          ) : (
            <div className="text-sm text-gray-700 dark:text-gray-300 break-words whitespace-pre-wrap max-h-96 overflow-y-auto pr-2">
               {content || strText}
            </div>
          )}
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
