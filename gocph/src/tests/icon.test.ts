/**
 * SVG Icon Validation Tests
 * 
 * **Validates: Requirements 1.4, 1.5**
 * 
 * Property 1: SVG Icon Validity
 * For the icon field in package.json, the base64-decoded content should be 
 * valid SVG XML with viewBox, width, and height attributes set to appropriate 
 * values for a 24x24 icon.
 */
import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('SVG Icon Validation', () => {
    test('package.json should have a valid base64-encoded SVG icon', () => {
        // Read package.json
        const packageJsonPath = path.join(__dirname, '../../package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        
        // Get the icon field from viewsContainers.activitybar
        const icon = packageJson.contributes?.viewsContainers?.activitybar?.[0]?.icon;
        
        // Verify icon field exists
        expect(icon).toBeDefined();
        expect(typeof icon).toBe('string');
        
        // Verify it has the correct data URI prefix
        expect(icon).toMatch(/^data:image\/svg\+xml;base64,/);
        
        // Extract and decode the base64 content
        const base64Content = icon.replace(/^data:image\/svg\+xml;base64,/, '');
        const svgContent = Buffer.from(base64Content, 'base64').toString('utf-8');
        
        // Verify it's valid XML/SVG (should start with <svg and end with </svg>)
        expect(svgContent.trim()).toMatch(/^<svg/);
        expect(svgContent.trim()).toMatch(/<\/svg>$/);
        
        // Verify required SVG attributes exist
        expect(svgContent).toContain('viewBox="0 0 24 24"');
        expect(svgContent).toContain('width="24"');
        expect(svgContent).toContain('height="24"');
        expect(svgContent).toContain('fill="currentColor"');
    });
    
    test('icon-sidebar.svg file should have correct attributes', () => {
        // Read the SVG file
        const svgPath = path.join(__dirname, '../../icon-sidebar.svg');
        const svgContent = fs.readFileSync(svgPath, 'utf-8');
        
        // Verify it's valid SVG
        expect(svgContent.trim()).toMatch(/^<svg/);
        expect(svgContent.trim()).toMatch(/<\/svg>$/);
        
        // Verify required attributes
        expect(svgContent).toContain('viewBox="0 0 24 24"');
        expect(svgContent).toContain('width="24"');
        expect(svgContent).toContain('height="24"');
        expect(svgContent).toContain('fill="currentColor"');
    });
    
    test('package.json icon should match icon-sidebar.svg content', () => {
        // Read package.json
        const packageJsonPath = path.join(__dirname, '../../package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        
        // Get the icon from package.json
        const icon = packageJson.contributes?.viewsContainers?.activitybar?.[0]?.icon;
        const base64Content = icon.replace(/^data:image\/svg\+xml;base64,/, '');
        const decodedSvg = Buffer.from(base64Content, 'base64').toString('utf-8');
        
        // Read the SVG file
        const svgPath = path.join(__dirname, '../../icon-sidebar.svg');
        const svgFileContent = fs.readFileSync(svgPath, 'utf-8');
        
        // They should match (accounting for potential whitespace differences)
        expect(decodedSvg.trim()).toBe(svgFileContent.trim());
    });
    
    test('SVG dimensions should be appropriate for 24x24 icon', () => {
        // Read package.json
        const packageJsonPath = path.join(__dirname, '../../package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        
        // Get the icon from package.json
        const icon = packageJson.contributes?.viewsContainers?.activitybar?.[0]?.icon;
        const base64Content = icon.replace(/^data:image\/svg\+xml;base64,/, '');
        const svgContent = Buffer.from(base64Content, 'base64').toString('utf-8');
        
        // Extract viewBox values
        const viewBoxMatch = svgContent.match(/viewBox="(\d+)\s+(\d+)\s+(\d+)\s+(\d+)"/);
        expect(viewBoxMatch).not.toBeNull();
        
        if (viewBoxMatch) {
            const [, x, y, width, height] = viewBoxMatch;
            expect(x).toBe('0');
            expect(y).toBe('0');
            expect(width).toBe('24');
            expect(height).toBe('24');
        }
        
        // Extract width and height attributes
        const widthMatch = svgContent.match(/width="(\d+)"/);
        const heightMatch = svgContent.match(/height="(\d+)"/);
        
        expect(widthMatch).not.toBeNull();
        expect(heightMatch).not.toBeNull();
        
        if (widthMatch && heightMatch) {
            expect(widthMatch[1]).toBe('24');
            expect(heightMatch[1]).toBe('24');
        }
    });
});
