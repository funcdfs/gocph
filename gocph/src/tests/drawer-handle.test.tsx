/**
 * Drawer Handle DOM Structure Tests
 * 
 * **Validates: Requirements 2.1, 2.2**
 * 
 * Property 2: Drawer Handle Simplicity
 * For the drawer-toggle element in the rendered DOM, it should contain no text 
 * content and no icon elements (elements with codicon classes).
 */
import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import GlobalDrawer from '../webview/frontend/GlobalDrawer';

describe('Drawer Handle DOM Structure', () => {
    test('drawer-toggle should contain no text content', () => {
        // Render the GlobalDrawer component
        const { container } = render(<GlobalDrawer />);
        
        // Query for the drawer-toggle element
        const drawerToggle = container.querySelector('.drawer-toggle');
        
        // Verify the element exists
        expect(drawerToggle).not.toBeNull();
        
        // Verify it contains no text content
        expect(drawerToggle?.textContent).toBe('');
    });
    
    test('drawer-toggle should contain no elements with codicon classes', () => {
        // Render the GlobalDrawer component
        const { container } = render(<GlobalDrawer />);
        
        // Query for the drawer-toggle element
        const drawerToggle = container.querySelector('.drawer-toggle');
        
        // Verify the element exists
        expect(drawerToggle).not.toBeNull();
        
        // Query for any elements with codicon classes inside drawer-toggle
        const codiconElements = drawerToggle?.querySelectorAll('[class*="codicon"]');
        
        // Verify no codicon elements exist
        expect(codiconElements?.length).toBe(0);
    });
    
    test('drawer-toggle should be an empty div with only onClick handler', () => {
        // Render the GlobalDrawer component
        const { container } = render(<GlobalDrawer />);
        
        // Query for the drawer-toggle element
        const drawerToggle = container.querySelector('.drawer-toggle');
        
        // Verify the element exists
        expect(drawerToggle).not.toBeNull();
        
        // Verify it has no child elements
        expect(drawerToggle?.children.length).toBe(0);
        
        // Verify it has no text nodes with content
        const textNodes = Array.from(drawerToggle?.childNodes || []).filter(
            node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim() !== ''
        );
        expect(textNodes.length).toBe(0);
    });
    
    test('drawer-toggle should not contain any icon elements', () => {
        // Render the GlobalDrawer component
        const { container } = render(<GlobalDrawer />);
        
        // Query for the drawer-toggle element
        const drawerToggle = container.querySelector('.drawer-toggle');
        
        // Verify the element exists
        expect(drawerToggle).not.toBeNull();
        
        // Query for any <i> elements (commonly used for icons)
        const iconElements = drawerToggle?.querySelectorAll('i');
        
        // Verify no icon elements exist
        expect(iconElements?.length).toBe(0);
    });
    
    test('drawer-toggle should not contain any span elements', () => {
        // Render the GlobalDrawer component
        const { container } = render(<GlobalDrawer />);
        
        // Query for the drawer-toggle element
        const drawerToggle = container.querySelector('.drawer-toggle');
        
        // Verify the element exists
        expect(drawerToggle).not.toBeNull();
        
        // Query for any <span> elements (commonly used for labels)
        const spanElements = drawerToggle?.querySelectorAll('span');
        
        // Verify no span elements exist
        expect(spanElements?.length).toBe(0);
    });
});
