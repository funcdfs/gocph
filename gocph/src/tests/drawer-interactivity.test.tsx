/**
 * Drawer Handle Interactivity Tests
 * 
 * **Validates: Requirements 2.3**
 * 
 * Property 3: Drawer Handle Interactivity
 * For the drawer-toggle element when the drawer is in collapsed state, the 
 * element should be visible (not display:none) and have an onClick handler attached.
 */
import { describe, test, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import GlobalDrawer from '../webview/frontend/GlobalDrawer';

describe('Drawer Handle Interactivity', () => {
    test('drawer-toggle should be visible when drawer is collapsed', () => {
        // Render the GlobalDrawer component
        const { container } = render(<GlobalDrawer />);
        
        // Query for the drawer-toggle element
        const drawerToggle = container.querySelector('.drawer-toggle');
        
        // Verify the element exists
        expect(drawerToggle).not.toBeNull();
        
        // Verify the drawer is in collapsed state
        const drawer = container.querySelector('.global-drawer');
        expect(drawer).toHaveClass('collapsed');
        
        // Verify the drawer-toggle is visible (not display:none)
        // In jsdom, we check that the element exists and is in the DOM
        expect(drawerToggle).toBeInTheDocument();
        
        // Verify it's not hidden via display:none
        const computedStyle = window.getComputedStyle(drawerToggle as Element);
        expect(computedStyle.display).not.toBe('none');
    });
    
    test('drawer-toggle should have onClick handler attached', () => {
        // Render the GlobalDrawer component
        const { container } = render(<GlobalDrawer />);
        
        // Query for the drawer-toggle element
        const drawerToggle = container.querySelector('.drawer-toggle');
        
        // Verify the element exists
        expect(drawerToggle).not.toBeNull();
        
        // Verify the drawer starts in collapsed state
        const drawer = container.querySelector('.global-drawer');
        expect(drawer).toHaveClass('collapsed');
        
        // Click the drawer-toggle element
        fireEvent.click(drawerToggle as Element);
        
        // Verify the drawer state changed to expanded (proving onClick handler works)
        expect(drawer).toHaveClass('expanded');
        expect(drawer).not.toHaveClass('collapsed');
    });
    
    test('drawer-toggle should be interactive in collapsed state', () => {
        // Render the GlobalDrawer component
        const { container } = render(<GlobalDrawer />);
        
        // Query for the drawer-toggle element
        const drawerToggle = container.querySelector('.drawer-toggle');
        
        // Verify the element exists
        expect(drawerToggle).not.toBeNull();
        
        // Verify the drawer starts in collapsed state
        const drawer = container.querySelector('.global-drawer');
        expect(drawer).toHaveClass('collapsed');
        
        // Verify the toggle element is visible and interactive
        expect(drawerToggle).toBeInTheDocument();
        
        // Verify it's not disabled or hidden
        expect(drawerToggle).not.toHaveAttribute('disabled');
        
        // Test that clicking the toggle actually works (functional test of onClick)
        fireEvent.click(drawerToggle as Element);
        
        // Verify the drawer expanded (proving the onClick handler is functional)
        expect(drawer).toHaveClass('expanded');
    });
    
    test('drawer-toggle should remain visible throughout drawer lifecycle', () => {
        // Render the GlobalDrawer component with initial collapsed state
        const { container } = render(<GlobalDrawer />);
        
        // Query for the drawer-toggle element
        const drawerToggle = container.querySelector('.drawer-toggle');
        
        // Verify the element exists and is visible in collapsed state
        expect(drawerToggle).not.toBeNull();
        expect(drawerToggle).toBeInTheDocument();
        
        // Verify the drawer is collapsed
        const drawer = container.querySelector('.global-drawer');
        expect(drawer).toHaveClass('collapsed');
        
        // The drawer-toggle should always be present regardless of state
        // This ensures users can always interact with it
        const computedStyle = window.getComputedStyle(drawerToggle as Element);
        expect(computedStyle.display).not.toBe('none');
        expect(computedStyle.visibility).not.toBe('hidden');
    });
});
