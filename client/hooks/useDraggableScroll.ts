import { useRef, useState, useEffect, useCallback } from 'react';

export function useDraggableScroll<T extends HTMLElement>() {
    const ref = useRef<T>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!ref.current) return;

        // Ignore if clicking on interactive elements or if it's not the left button
        const target = e.target as HTMLElement;
        if (
            target.closest('button') ||
            target.closest('a') ||
            target.closest('[data-no-drag]') ||
            e.button !== 0
        ) {
            return;
        }

        setIsDragging(true);
        setStartX(e.pageX - ref.current.offsetLeft);
        setScrollLeft(ref.current.scrollLeft);
        ref.current.style.cursor = 'grabbing';
        ref.current.style.userSelect = 'none';
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsDragging(false);
        if (ref.current) {
            ref.current.style.cursor = 'default';
            ref.current.style.removeProperty('user-select');
        }
    }, []);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        if (ref.current) {
            ref.current.style.cursor = 'default';
            ref.current.style.removeProperty('user-select');
        }
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging || !ref.current) return;

        e.preventDefault();
        const x = e.pageX - ref.current.offsetLeft;
        const walk = (x - startX) * 1.5; // Scroll speed multiplier
        ref.current.scrollLeft = scrollLeft - walk;
    }, [isDragging, startX, scrollLeft]);

    return {
        ref,
        events: {
            onMouseDown: handleMouseDown,
            onMouseLeave: handleMouseLeave,
            onMouseUp: handleMouseUp,
            onMouseMove: handleMouseMove,
        },
        isDragging // Exported in case needed for styling
    };
}
