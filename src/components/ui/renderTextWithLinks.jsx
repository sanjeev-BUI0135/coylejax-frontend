export const renderTextWithLinks = (text) => {
  if (!text) return null;

  const urlRegex = /(https?:\/\/[^\s]+)/g;

  return text.split(urlRegex).map((part, index) => {
    if (part.startsWith("http://") || part.startsWith("https://")) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

export const linkifyHtml = (str) => {
  if (!str) return "";
  const hasHTML = /<[a-z][\s\S]*>/i.test(str);
  if (!hasHTML) {
    return str.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">$1</a>');
  }
  if (typeof window !== "undefined" && typeof DOMParser !== "undefined") {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<body>${str}</body>`, "text/html");
      const linkifyNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent;
          const urlRegex = /(https?:\/\/[^\s<]+)/g;
          const replaced = text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">$1</a>');
          if (replaced !== text) {
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = replaced;
            const fragment = document.createDocumentFragment();
            while (tempDiv.firstChild) {
              fragment.appendChild(tempDiv.firstChild);
            }
            node.parentNode.replaceChild(fragment, node);
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName.toLowerCase() !== "a") {
            const children = Array.from(node.childNodes);
            children.forEach(linkifyNode);
          }
        }
      };
      linkifyNode(doc.body);
      return doc.body.innerHTML;
    } catch (e) {
      console.error("linkifyHtml failed:", e);
      return str;
    }
  }
  return str;
};

export const handlePasteLink = (e, cleanData, maxCharCount, core) => {
  try {
    const pastedText = e.clipboardData?.getData("text");
    if (pastedText) {
      const trimmed = pastedText.trim();
      const urlRegex = /^https?:\/\/[^\s]+$/;
      if (urlRegex.test(trimmed)) {
        e.preventDefault();
        
        const link = document.createElement("a");
        link.href = trimmed;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.className = "text-blue-600 underline";
        link.textContent = trimmed;
        
        const realCore = core?.core || core;
        let inserted = false;
        
        if (realCore && typeof realCore.insertNode === "function") {
          realCore.insertNode(link);
          inserted = true;
        } else if (core && typeof core.insertHTML === "function") {
          const linkHtml = `<a href="${trimmed}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">${trimmed}</a>`;
          core.insertHTML(linkHtml);
          inserted = true;
        } else if (realCore && typeof realCore.insertHTML === "function") {
          const linkHtml = `<a href="${trimmed}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">${trimmed}</a>`;
          realCore.insertHTML(linkHtml);
          inserted = true;
        } else {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(link);
            range.setStartAfter(link);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            inserted = true;
          }
        }
        
        if (inserted && realCore) {
          if (realCore.history && typeof realCore.history.push === "function") {
            realCore.history.push(false);
          }
          if (typeof realCore.onChange === "function") {
            try {
              const content = typeof realCore.getContents === "function" 
                ? realCore.getContents() 
                : realCore.context?.element?.wysiwyg?.innerHTML;
              if (content) {
                realCore.onChange(content);
              }
            } catch (err) {
              console.warn("Could not trigger onChange directly:", err);
            }
          }
        }
        return false;
      }
    }
  } catch (err) {
    console.error("handlePasteLink error:", err);
  }
};