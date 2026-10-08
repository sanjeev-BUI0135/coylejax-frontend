import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export const generateMultiPagePDF = async ({
  headerRef,
  bodyRef,
  filename,
  onStart,
  onComplete,
  onError
}) => {
  try {
    // Call onStart callback
    if (onStart) onStart();

    // Small delay to ensure DOM is ready
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Validate refs
    if (!headerRef || !bodyRef) {
      throw new Error("Header or body reference not found");
    }

    // Initialize PDF
    const pdf = new jsPDF("p", "px", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;

    // ============ CAPTURE HEADER ============
    const headerCanvas = await html2canvas(headerRef, {
      scale: 2,
      useCORS: true,
      logging: false
    });

    const headerImg = headerCanvas.toDataURL("image/jpeg", 0.9);
    const headerProps = pdf.getImageProperties(headerImg);
    const headerHeight = (headerProps.height * pageWidth) / headerProps.width;

    // ============ CAPTURE BODY ============
    const bodyCanvas = await html2canvas(bodyRef, {
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: bodyRef.scrollWidth,
      windowHeight: bodyRef.scrollHeight
    });

    // Calculate content dimensions
    const contentHeight = pageHeight - headerHeight - margin * 2;
    const ratio = bodyCanvas.width / pageWidth;
    const sliceHeight = contentHeight * ratio;

    let position = 0;
    let page = 0;

    // ============ CREATE PAGES ============
    while (position < bodyCanvas.height) {
      // Create canvas slice for current page
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = bodyCanvas.width;
      sliceCanvas.height = Math.min(sliceHeight, bodyCanvas.height - position);

      const ctx = sliceCanvas.getContext("2d");

      // Draw the slice from body canvas
      ctx.drawImage(
        bodyCanvas,
        0,
        position,
        bodyCanvas.width,
        sliceCanvas.height,
        0,
        0,
        bodyCanvas.width,
        sliceCanvas.height
      );

      const sliceImg = sliceCanvas.toDataURL("image/jpeg", 0.85);

      // Add new page if not first page
      if (page > 0) pdf.addPage();

      // Draw header on every page
      pdf.addImage(headerImg, "JPEG", 0, 0, pageWidth, headerHeight);

      // Draw body slice
      pdf.addImage(
        sliceImg,
        "JPEG",
        0,
        headerHeight + margin,
        pageWidth,
        sliceCanvas.height / ratio
      );

      position += sliceHeight;
      page++;
    }

    // Save PDF
    pdf.save(filename);

    // Call onComplete callback
    if (onComplete) onComplete();

    return true;
  } catch (error) {
    console.error("PDF generation error:", error);
    
    // Call onError callback
    if (onError) {
      onError(error);
    } else {
      alert("PDF generation failed");
    }

    return false;
  }
};
