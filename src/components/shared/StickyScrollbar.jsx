import React, { useRef, useEffect, useState } from "react";
import PropTypes from "prop-types";

const StickyScrollbar = ({ tableContainerRef }) => {
  const scrollbarRef = useRef(null);
  const scrollContentRef = useRef(null);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);

  useEffect(() => {
    const updateSize = () => {
      if (tableContainerRef.current) {
        const sw = tableContainerRef.current.scrollWidth;
        const cw = tableContainerRef.current.clientWidth;
        setScrollWidth(sw);
        setClientWidth(cw);
        if (scrollContentRef.current) {
          scrollContentRef.current.style.width = `${sw}px`;
        }
      }
    };

    updateSize();

    window.addEventListener("resize", updateSize);
    const observer = new MutationObserver(updateSize);
    if (tableContainerRef.current) {
      observer.observe(tableContainerRef.current, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    return () => {
      window.removeEventListener("resize", updateSize);
      observer.disconnect();
    };
  }, [tableContainerRef]);

  useEffect(() => {
    const tableContainer = tableContainerRef.current;
    const scrollbar = scrollbarRef.current;

    let isSyncingLeft = false;
    let isSyncingRight = false;

    const handleTableScroll = () => {
      if (!isSyncingLeft && scrollbar && tableContainer) {
        isSyncingRight = true;
        scrollbar.scrollLeft = tableContainer.scrollLeft;
      }
      isSyncingLeft = false;
    };

    const handleScrollbarScroll = () => {
      if (!isSyncingRight && scrollbar && tableContainer) {
        isSyncingLeft = true;
        tableContainer.scrollLeft = scrollbar.scrollLeft;
      }
      isSyncingRight = false;
    };

    if (tableContainer && scrollbar) {
      // Sync initial scroll position when the scrollbar mounts
      scrollbar.scrollLeft = tableContainer.scrollLeft;

      tableContainer.addEventListener("scroll", handleTableScroll, { passive: true });
      scrollbar.addEventListener("scroll", handleScrollbarScroll, { passive: true });
    }

    return () => {
      if (tableContainer) {
        tableContainer.removeEventListener("scroll", handleTableScroll);
      }
      if (scrollbar) {
        scrollbar.removeEventListener("scroll", handleScrollbarScroll);
      }
    };
  }, [tableContainerRef, scrollWidth, clientWidth]);

  const isScrollable = scrollWidth > clientWidth;

  if (!isScrollable) return null;

  return (
    <div
      ref={scrollbarRef}
      className="sticky bottom-0 z-40 w-full overflow-x-auto bg-gray-100/95 backdrop-blur-md border-gray-300 custom-scrollbar shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.15)]"
      style={{
        height: "16px",
        borderRadius: "0 0 8px 8px",
      }}
    >
      <div ref={scrollContentRef} style={{ height: "1px", width: `${scrollWidth}px` }}></div>
    </div>
  );
};

StickyScrollbar.propTypes = {
  tableContainerRef: PropTypes.object.isRequired,
};

export default StickyScrollbar;
