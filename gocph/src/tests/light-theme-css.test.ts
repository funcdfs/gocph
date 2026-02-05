/**
 * Light Theme CSS Coverage Tests
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3**
 * 
 * Property 5: Light Theme CSS Coverage
 * For all major UI component classes (icons, text, drawer elements), there should 
 * exist corresponding body.vscode-light CSS rules that define color-related properties.
 */
import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Helper function to parse CSS and extract selectors with their properties
function parseCSSFile(cssContent: string): Map<string, Set<string>> {
    const selectorMap = new Map<string, Set<string>>();
    
    // Remove comments
    const cleanedCSS = cssContent.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Match CSS rules: selector { properties }
    const ruleRegex = /([^{}]+)\{([^{}]+)\}/g;
    let match;
    
    while ((match = ruleRegex.exec(cleanedCSS)) !== null) {
        const selector = match[1].trim();
        const properties = match[2].trim();
        
        // Extract property names (before the colon)
        const propertyNames = properties
            .split(';')
            .map(prop => prop.split(':')[0].trim())
            .filter(prop => prop.length > 0);
        
        if (!selectorMap.has(selector)) {
            selectorMap.set(selector, new Set());
        }
        
        propertyNames.forEach(prop => {
            selectorMap.get(selector)!.add(prop);
        });
    }
    
    return selectorMap;
}

// Helper function to check if a property set contains color-related properties
function hasColorProperties(properties: Set<string>): boolean {
    const colorProps = [
        'color',
        'background',
        'background-color',
        'border-color',
        'border-top-color',
        'border-bottom-color',
        'border-left-color',
        'border-right-color',
        'fill',
        'stroke',
        'box-shadow',
        'text-shadow',
        'outline-color'
    ];
    
    return Array.from(properties).some(prop => 
        colorProps.some(colorProp => prop.includes(colorProp))
    );
}

// Helper function to extract base class from a selector
function extractBaseClasses(selector: string): string[] {
    // Remove pseudo-classes and pseudo-elements
    const cleaned = selector
        .replace(/::[a-z-]+/g, '') // Remove ::before, ::after, etc.
        .replace(/:[a-z-]+/g, '');  // Remove :hover, :focus, etc.
    
    // Extract class names
    const classMatches = cleaned.match(/\.[a-z0-9_-]+/gi);
    return classMatches ? classMatches.map(c => c.substring(1)) : [];
}

describe('Light Theme CSS Coverage', () => {
    let cssContent: string;
    let selectorMap: Map<string, Set<string>>;
    
    // Read and parse CSS file once for all tests
    beforeAll(() => {
        const cssPath = path.join(__dirname, '../webview/frontend/app.css');
        cssContent = fs.readFileSync(cssPath, 'utf-8');
        selectorMap = parseCSSFile(cssContent);
    });
    
    test('app.css file should exist and be readable', () => {
        expect(cssContent).toBeDefined();
        expect(cssContent.length).toBeGreaterThan(0);
    });
    
    test('CSS should contain body.vscode-light selectors', () => {
        const lightThemeSelectors = Array.from(selectorMap.keys())
            .filter(selector => selector.includes('body.vscode-light'));
        
        expect(lightThemeSelectors.length).toBeGreaterThan(0);
    });
    
    test('major icon classes should have light theme variants with color properties', () => {
        // Icon-related classes that should have light theme variants
        const iconClasses = [
            'icon-btn',
            'clickable-icon',
            'header-icon-label',
            'toggle-fold-icon',
            'toggle-icon'
        ];
        
        iconClasses.forEach(iconClass => {
            // Find light theme selectors for this class
            const lightThemeSelectors = Array.from(selectorMap.keys())
                .filter(selector => 
                    selector.includes('body.vscode-light') && 
                    selector.includes(`.${iconClass}`)
                );
            
            // Should have at least one light theme variant
            expect(lightThemeSelectors.length).toBeGreaterThan(0, 
                `Icon class .${iconClass} should have light theme variant`);
            
            // At least one variant should define color-related properties
            const hasColorProps = lightThemeSelectors.some(selector => {
                const props = selectorMap.get(selector);
                return props && hasColorProperties(props);
            });
            
            expect(hasColorProps).toBe(true, 
                `Icon class .${iconClass} light theme variant should define color properties`);
        });
    });
    
    test('major text classes should have light theme variants with color properties', () => {
        // Text-related classes that should have light theme variants
        const textClasses = [
            'case-label-text',
            'time-label',
            'editor-label',
            'problem-name-text',
            'editor-content'
        ];
        
        textClasses.forEach(textClass => {
            // Find light theme selectors for this class
            const lightThemeSelectors = Array.from(selectorMap.keys())
                .filter(selector => 
                    selector.includes('body.vscode-light') && 
                    selector.includes(`.${textClass}`)
                );
            
            // Should have at least one light theme variant
            expect(lightThemeSelectors.length).toBeGreaterThan(0, 
                `Text class .${textClass} should have light theme variant`);
            
            // At least one variant should define color-related properties
            const hasColorProps = lightThemeSelectors.some(selector => {
                const props = selectorMap.get(selector);
                return props && hasColorProperties(props);
            });
            
            expect(hasColorProps).toBe(true, 
                `Text class .${textClass} light theme variant should define color properties`);
        });
    });
    
    test('global drawer elements should have light theme variants with color properties', () => {
        // Drawer-related classes that should have light theme variants
        const drawerClasses = [
            'global-drawer',
            'drawer-toggle',
            'drawer-editor',
            'drawer-actions'
        ];
        
        drawerClasses.forEach(drawerClass => {
            // Find light theme selectors for this class
            const lightThemeSelectors = Array.from(selectorMap.keys())
                .filter(selector => 
                    selector.includes('body.vscode-light') && 
                    selector.includes(`.${drawerClass}`)
                );
            
            // Should have at least one light theme variant
            expect(lightThemeSelectors.length).toBeGreaterThan(0, 
                `Drawer class .${drawerClass} should have light theme variant`);
            
            // At least one variant should define color-related properties
            const hasColorProps = lightThemeSelectors.some(selector => {
                const props = selectorMap.get(selector);
                return props && hasColorProperties(props);
            });
            
            expect(hasColorProps).toBe(true, 
                `Drawer class .${drawerClass} light theme variant should define color properties`);
        });
    });
    
    test('button classes should have light theme variants with color properties', () => {
        // Button-related classes that should have light theme variants
        const buttonClasses = [
            'action-btn',
            'header-btn',
            'run-btn',
            'stop-btn',
            'new-btn',
            'void-btn',
            'copy-btn',
            'toggle-btn'
        ];
        
        buttonClasses.forEach(buttonClass => {
            // Find light theme selectors for this class
            const lightThemeSelectors = Array.from(selectorMap.keys())
                .filter(selector => 
                    selector.includes('body.vscode-light') && 
                    selector.includes(`.${buttonClass}`)
                );
            
            // Should have at least one light theme variant
            expect(lightThemeSelectors.length).toBeGreaterThan(0, 
                `Button class .${buttonClass} should have light theme variant`);
            
            // At least one variant should define color-related properties
            const hasColorProps = lightThemeSelectors.some(selector => {
                const props = selectorMap.get(selector);
                return props && hasColorProperties(props);
            });
            
            expect(hasColorProps).toBe(true, 
                `Button class .${buttonClass} light theme variant should define color properties`);
        });
    });
    
    test('status and label classes should have light theme variants', () => {
        // Status and label classes
        const statusClasses = [
            'status-label',
            'case-label',
            'pass-rate-tag'
        ];
        
        statusClasses.forEach(statusClass => {
            // Find light theme selectors for this class
            const lightThemeSelectors = Array.from(selectorMap.keys())
                .filter(selector => 
                    selector.includes('body.vscode-light') && 
                    selector.includes(`.${statusClass}`)
                );
            
            // Should have at least one light theme variant
            expect(lightThemeSelectors.length).toBeGreaterThan(0, 
                `Status class .${statusClass} should have light theme variant`);
            
            // At least one variant should define color-related properties
            const hasColorProps = lightThemeSelectors.some(selector => {
                const props = selectorMap.get(selector);
                return props && hasColorProperties(props);
            });
            
            expect(hasColorProps).toBe(true, 
                `Status class .${statusClass} light theme variant should define color properties`);
        });
    });
    
    test('editor and diff box classes should have light theme variants', () => {
        // Editor-related classes
        const editorClasses = [
            'editor-box',
            'diff-box',
            'line-numbers',
            'diff-line'
        ];
        
        editorClasses.forEach(editorClass => {
            // Find light theme selectors for this class
            const lightThemeSelectors = Array.from(selectorMap.keys())
                .filter(selector => 
                    selector.includes('body.vscode-light') && 
                    selector.includes(`.${editorClass}`)
                );
            
            // Should have at least one light theme variant
            expect(lightThemeSelectors.length).toBeGreaterThan(0, 
                `Editor class .${editorClass} should have light theme variant`);
            
            // At least one variant should define color-related properties
            const hasColorProps = lightThemeSelectors.some(selector => {
                const props = selectorMap.get(selector);
                return props && hasColorProperties(props);
            });
            
            expect(hasColorProps).toBe(true, 
                `Editor class .${editorClass} light theme variant should define color properties`);
        });
    });
    
    test('notification classes should have light theme color adaptations', () => {
        // Notification-related selectors
        const notificationSelectors = [
            'notification-success .codicon',
            'notification-error .codicon',
            'notification-warning .codicon',
            'notification-info .codicon'
        ];
        
        notificationSelectors.forEach(notifSelector => {
            // Find light theme selectors
            const lightThemeSelectors = Array.from(selectorMap.keys())
                .filter(selector => 
                    selector.includes('body.vscode-light') && 
                    selector.includes(notifSelector.split(' ')[0])
                );
            
            // Should have at least one light theme variant
            expect(lightThemeSelectors.length).toBeGreaterThan(0, 
                `Notification selector ${notifSelector} should have light theme variant`);
        });
    });
    
    test('light theme variants should define appropriate color properties', () => {
        // Get all light theme selectors
        const lightThemeSelectors = Array.from(selectorMap.keys())
            .filter(selector => selector.includes('body.vscode-light'));
        
        // Count how many define color-related properties
        const selectorsWithColorProps = lightThemeSelectors.filter(selector => {
            const props = selectorMap.get(selector);
            return props && hasColorProperties(props);
        });
        
        // At least 80% of light theme selectors should define color properties
        const percentage = (selectorsWithColorProps.length / lightThemeSelectors.length) * 100;
        expect(percentage).toBeGreaterThan(80, 
            `At least 80% of light theme selectors should define color properties (found ${percentage.toFixed(1)}%)`);
    });
    
    test('comprehensive coverage: all major UI components have light theme adaptations', () => {
        // Comprehensive list of all major UI component classes
        const allMajorClasses = [
            // Icons
            'icon-btn', 'clickable-icon', 'header-icon-label', 'toggle-fold-icon', 'toggle-icon',
            // Text
            'case-label-text', 'time-label', 'editor-label', 'problem-name-text', 'editor-content',
            // Drawer
            'global-drawer', 'drawer-toggle', 'drawer-editor', 'drawer-actions',
            // Buttons
            'action-btn', 'header-btn', 'run-btn', 'stop-btn', 'new-btn', 'void-btn', 'copy-btn', 'toggle-btn',
            // Status/Labels
            'status-label', 'case-label', 'pass-rate-tag',
            // Editor
            'editor-box', 'diff-box', 'line-numbers', 'diff-line',
            // Case elements
            'case', 'case-header',
            // File links
            'file-link'
        ];
        
        const missingLightTheme: string[] = [];
        
        allMajorClasses.forEach(className => {
            const lightThemeSelectors = Array.from(selectorMap.keys())
                .filter(selector => 
                    selector.includes('body.vscode-light') && 
                    selector.includes(`.${className}`)
                );
            
            if (lightThemeSelectors.length === 0) {
                missingLightTheme.push(className);
            }
        });
        
        expect(missingLightTheme).toEqual([]);
        
        if (missingLightTheme.length > 0) {
            console.log('Classes missing light theme variants:', missingLightTheme);
        }
    });
});
