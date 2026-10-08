import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    const scrollContainer = document.getElementById("page-content");

    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: 0,
        behavior: "auto", 
      });
    }
  }, [pathname]);

  return null;
}
