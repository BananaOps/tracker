# Tracker Assets

This directory contains visual assets for the Tracker project.

## Logo

### SVG Version
- **File**: `logo.svg`
- **Format**: Scalable Vector Graphics
- **Usage**: README, documentation, web
- **Features**: 
  - Gradient purple to blue
  - Rocket icon
  - "Tracker" text
  - Transparent background

### Creating PNG Version

If you need a PNG version, you can convert the SVG using:

```bash
# Using ImageMagick
convert -background none -density 300 logo.svg logo.png

# Using Inkscape
inkscape logo.svg --export-png=logo.png --export-width=600

# Using rsvg-convert
rsvg-convert -w 600 -h 200 logo.svg > logo.png
```

## Usage

### In README
```markdown
![Tracker Logo](./docs/assets/logo.svg)
```

### In HTML
```html
<img src="./docs/assets/logo.svg" alt="Tracker Logo" width="300">
```

### In React
```jsx
import logo from './docs/assets/logo.svg'

<img src={logo} alt="Tracker Logo" />
```

## Design Guidelines

### Colors
- **Primary Purple**: `#9333ea`
- **Primary Blue**: `#2563eb`
- **Accent Yellow**: `#fbbf24` (flame)
- **White**: `#ffffff` (rocket body)

### Dimensions
- **Original**: 200x200px
- **Recommended display**: 300px width
- **Minimum size**: 100px width

### Variations

You can create variations by modifying the SVG:

1. **Dark mode version**: Change white to dark colors
2. **Monochrome**: Remove gradients, use single color
3. **Icon only**: Remove text, keep rocket
4. **Text only**: Remove rocket, keep text with gradient

## License

The Tracker logo is part of the Tracker project and is licensed under the Apache 2.0 License.
