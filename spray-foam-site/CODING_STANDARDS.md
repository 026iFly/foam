# Coding Standards - Intellifoam Website

## Text Contrast and Accessibility

### CRITICAL RULE: Explicit Text Colors Required

**ALWAYS add explicit text color classes to ALL text elements including:**
- Headers (h1-h6)
- Paragraphs (p)
- Labels (label)
- **Input fields (input, textarea, select)** - CRITICAL!
- Buttons (button)
- Links (a)
- Divs with text content

**Never rely on browser defaults or parent element inheritance.**

### Background-Based Text Color Rules

#### Light Backgrounds (white, gray-50, gray-100, gray-200)
Use dark text colors:
- **Headers (h1-h6)**: `text-gray-900` or `text-gray-800`
- **Body text (p)**: `text-gray-900` or `text-gray-800`
- **Labels**: `text-gray-700`
- **Input fields**: `text-gray-900` - REQUIRED!
- **Secondary text**: `text-gray-700`

```tsx
// ✅ CORRECT - All text elements have explicit colors
<div className="bg-white rounded-lg p-8">
  <h2 className="text-2xl font-semibold mb-6 text-gray-900">Title</h2>
  <p className="text-gray-900">Body text</p>
  <label className="text-gray-700">Field Label</label>
  <input
    type="text"
    className="border border-gray-300 px-4 py-2 text-gray-900"
  />
</div>

// ❌ WRONG - Missing text colors on multiple elements
<div className="bg-white rounded-lg p-8">
  <h2 className="text-2xl font-semibold mb-6">Title</h2>
  <p>Body text</p>
  <label>Field Label</label>
  <input type="text" className="border border-gray-300 px-4 py-2" />
</div>
```

#### Dark Backgrounds (gray-700, gray-800, green-700, blue-600, etc.)
Use light text colors:
- **Headers (h1-h6)**: `text-white`
- **Body text (p)**: `text-white` or `text-gray-100`
- **Labels**: `text-white` or `text-gray-100`
- **Input fields**: `text-white` or `text-gray-100`
- **Secondary text**: `text-gray-300` or `text-gray-400`

```tsx
// ✅ CORRECT - All elements have explicit colors
<div className="bg-green-700 text-white rounded-lg p-8">
  <h2 className="text-2xl font-semibold mb-6 text-white">Title</h2>
  <p className="text-white">Body text</p>
  <label className="text-white">Field Label</label>
  <input
    type="text"
    className="border border-gray-300 px-4 py-2 text-white"
  />
</div>

// ❌ WRONG - Missing explicit text colors
<div className="bg-green-700 text-white rounded-lg p-8">
  <h2 className="text-2xl font-semibold mb-6">Title</h2>
  <p>Body text</p>
  <label>Field Label</label>
  <input type="text" className="border border-gray-300 px-4 py-2" />
</div>
```

### Color Contrast Guidelines (WCAG AA Compliance)

- **Normal text**: Minimum contrast ratio of 4.5:1
- **Large text (18pt+)**: Minimum contrast ratio of 3:1
- **Headers**: Should always have high contrast (4.5:1 or better)

### Common Mistakes to Avoid

1. **Using text-gray-600 or text-gray-500 on white backgrounds**
   - ❌ Poor contrast, hard to read
   - ✅ Use text-gray-900 or text-gray-800 instead

2. **Relying on parent element's text color**
   - ❌ Headers without explicit colors inherit unpredictably
   - ✅ Always add explicit text-color class to every text element

3. **Using dark text on dark backgrounds**
   - ❌ text-gray-900 on bg-green-700 (both dark)
   - ✅ text-white on bg-green-700

4. **Missing text colors entirely**
   - ❌ `<h3 className="font-semibold mb-2">Text</h3>`
   - ✅ `<h3 className="font-semibold mb-2 text-gray-900">Text</h3>`

5. **CRITICAL: Missing text colors on input fields**
   - ❌ `<input className="border px-4 py-2" />` - Text will be hard to read!
   - ✅ `<input className="border px-4 py-2 text-gray-900" />`
   - This is especially important because users type into these fields and need to see what they're typing!

6. **Missing colors on select dropdowns**
   - ❌ `<select className="border px-4 py-2">...</select>`
   - ✅ `<select className="border px-4 py-2 text-gray-900">...</select>`

### Pre-Commit Checklist

Before committing code with text elements:

1. ✅ Every `<h1>` through `<h6>` has an explicit text-color class
2. ✅ All `<p>` tags have explicit text colors
3. ✅ All `<label>` tags have explicit text colors
4. ✅ **CRITICAL: All `<input>`, `<textarea>`, and `<select>` fields have `text-gray-900` or appropriate color**
5. ✅ All buttons and links with text have explicit colors
6. ✅ Text colors match the background (dark on light, light on dark)
7. ✅ No use of text-gray-600 or lighter on white/light backgrounds
8. ✅ Visual inspection shows all text is clearly readable, including when typing into input fields

### Testing for Compliance

Run this command to find headers without explicit text colors:

```bash
grep -rn '<h[1-6] className="[^"]*">' app/*.tsx app/*/*.tsx 2>/dev/null | \
  grep -v "text-gray-[789]00\|text-white\|text-green\|text-blue\|text-red\|text-yellow\|text-black"
```

**Expected result**: Zero matches (excluding old/backup files)

### Why This Matters

1. **Accessibility**: Users with visual impairments need high contrast
2. **Professionalism**: Low-contrast text looks unprofessional
3. **Consistency**: Explicit colors ensure consistent rendering across browsers
4. **Maintainability**: Clear which colors are used without hunting for parent styles

### Reference - Tailwind Text Color Scale

For white/light backgrounds:
- `text-gray-900` - Nearly black (best for headers and body)
- `text-gray-800` - Very dark gray (good for headers)
- `text-gray-700` - Dark gray (good for secondary text)
- `text-gray-600` - ❌ Too light for white backgrounds
- `text-gray-500` - ❌ Too light for white backgrounds

For dark backgrounds (gray-700+):
- `text-white` - Pure white (best for headers)
- `text-gray-100` - Very light gray (good for body)
- `text-gray-300` - Light gray (good for secondary text)
- `text-gray-400` - Medium gray (use sparingly)

---

**Last Updated**: 2026-01-17
**Enforced**: Mandatory for all commits
