import { useState, useEffect } from 'react';

export default function useResponsive() {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Eseményfigyelő hozzáadása az ablak átméretezésére
    window.addEventListener('resize', handleResize);
    
    // Takarítás a komponens eltűnésekor
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    width: windowSize.width,
    isMobile: windowSize.width < 768, // Telefonok
    isTablet: windowSize.width >= 768 && windowSize.width < 1024, // Tabletek
    isDesktop: windowSize.width >= 1024, // Monitorok (itt kapod a tegnapi gigantikus dizájnt)
  };
}